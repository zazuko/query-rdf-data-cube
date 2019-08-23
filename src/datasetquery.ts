import { literal, namedNode, quad, variable } from "@rdfjs/data-model";
import clone from "clone";
import { Quad, Term, Variable } from "rdf-js";
import {Generator as SparqlGenerator} from "sparqljs";
// import { Wildcard } from "sparqljs/lib/Wildcard";
import {inspect} from "util";
import DataSet from "./dataset";
import Attribute from "./expressions/attribute";
import Component from "./expressions/component";
import Dimension from "./expressions/dimension";
import Measure from "./expressions/measure";
import SparqlFetcher from "./sparqlfetcher";
import { BgpPattern, Expression, SelectQuery, VariableExpression } from "./sparqljs";

interface ISelectObject {
  [bindingName: string]: Dimension|Measure|Attribute;
}

type PredicateFunction = (data: ISelectObject) => Component;

interface IState {
  selects: ISelectObject;
  filters: PredicateFunction[];
  groupBys: Array<PredicateFunction | string>;
  havings: PredicateFunction[];
}

const baseState: IState = {
  selects: {},
  filters: [],
  groupBys: [],
  havings: [],
};

function l(obj: any) {
  return inspect(obj, false, 10000, true);
}

class DataSetQuery {
  public dataSet: DataSet;
  public state: IState;
  // one map from bindingName to Component, one from component IRI to bindingName
  public bindingToComponent: {[bindingName: string]: Component} = {};
  public iriToBinding: {[componentIri: string]: string} = {};
  private fetcher: SparqlFetcher;
  private tmpVarCount: number = 0;
  private debug: boolean = false;

  constructor(dataSet: DataSet, state = baseState) {
    this.dataSet = dataSet;
    this.state = state;
    this.fetcher = new SparqlFetcher(this.dataSet.endpoint);
  }

  public clone() {
    return new DataSetQuery(this.dataSet, clone(this.state));
  }

  public select(selects: IState["selects"]) {
    const self = this.clone();
    Object.assign(self.state.selects, selects);
    Object.entries(self.state.selects).forEach(([bindingName, component]) => {
      self.bindingToComponent[bindingName] = component;
      self.iriToBinding[component.iri.value] = bindingName;
      self.state.selects[bindingName] = component;
    });
    return self;
  }

  public filter(fn: PredicateFunction) {
    const self = this.clone();
    self.state.filters.push(fn);
    return self;
  }

  public groupBy(fn: PredicateFunction | string) {
    const self = this.clone();
    self.state.groupBys.push(fn);
    return self;
  }

  public having(fn: PredicateFunction) {
    const self = this.clone();
    self.state.havings.push(fn);
    return self;
  }

  public async execute() {
    const query = await this.toSparql();
    if (this.debug) {
      console.warn(`executing query`, l(query));
    }
    return await this.fetcher.select(query);
  }

  public async toSparql(): Promise<string> {
    if (this.debug) {
      console.warn(`building query from state`, l(this.state));
    }

    let hasDistinct = false;
    let hasAggregate = false;
    Object.values(this.state.selects).forEach((component) => {
      if (component.aggregateType) {
        hasAggregate = true;
      }
      if (component.isDistinct) {
        hasDistinct = true;
      }
    });
    const groupedOnBindingNames = [];
    const addedDimensionsIRIs = [];

    const query: SelectQuery = {
      type: "query",
      prefixes: {},
      queryType: "SELECT",
      variables:  [],
      from: {
        default: [
          this.dataSet.graphIri,
        ],
        named: [],
      },
      distinct: hasDistinct,
      where: [],
      // having: [
      //   {
      //     type: "operation",
      //     operator: ">",
      //     args: [
      //       {
      //         expression: variable("size"),
      //         type: "aggregate",
      //         aggregation: "avg",
      //         distinct: false,
      //       },
      //       literal("10", namedNode("http://www.w3.org/2001/XMLSchema#integer")),
      //     ],
      //   },
      // ],
      limit: 10,
    };

    const mainWhereClauses: BgpPattern = {
      type: "bgp",
      triples: [{
        subject: variable("observation"),
        predicate: namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        object: namedNode("http://purl.org/linked-data/cube#Observation"),
      }],
    };

    Object.entries(this.state.selects)
      .filter(([, component]) => component.componentType === "dimension")
      .forEach(([bindingName, component]) => {
        this.bindingToComponent[bindingName] = component;
        this.iriToBinding[component.iri.value] = bindingName;
        addedDimensionsIRIs.push(component.iri.value);
        mainWhereClauses.triples.push({
          subject: variable("observation"),
          predicate: component.iri,
          object: variable(bindingName),
        });
        query.variables.push(variable(bindingName));
      });

    // add dimensions that haven't been explicitly selected
    const dimensions = await this.dataSet.dimensions();
    dimensions
      .filter(({ iri }) => !addedDimensionsIRIs.includes(iri.value))
      .forEach((component) => {
        const tmpVar = this.newTmpVar();
        this.bindingToComponent[tmpVar.value] = component;
        this.iriToBinding[component.iri.value] = tmpVar.value;
        addedDimensionsIRIs.push(component.iri.value);
        mainWhereClauses.triples.push({
          subject: variable("observation"),
          predicate: component.iri,
          object: tmpVar,
        });
      });

    Object.entries(this.state.selects)
      .filter(([, component]) => component.componentType === "measure")
      .forEach(([bindingName, component]) => {
        this.bindingToComponent[bindingName] = component;
        this.iriToBinding[component.iri.value] = bindingName;
        if (component.aggregateType) {
          const tmp = this.newTmpVar();
          query.variables.push({
            expression: {
              expression: tmp,
              type: "aggregate",
              aggregation: component.aggregateType,
              distinct: component.isDistinct,
            },
            variable: variable(bindingName),
          });

          mainWhereClauses.triples.push({
            subject: variable("observation"),
            predicate: component.iri,
            object: tmp,
          });
        } else {
          mainWhereClauses.triples.push({
            subject: variable("observation"),
            predicate: component.iri,
            object: variable(bindingName),
          });
          query.variables.push(variable(bindingName));
        }
      });
    query.where.push(mainWhereClauses);

    Object.entries(this.state.selects)
      .filter(([, component]) => component.componentType === "attribute")
      .forEach(([bindingName, component]) => {
        this.bindingToComponent[bindingName] = component;
        this.iriToBinding[component.iri.value] = bindingName;
        query.variables.push(variable(bindingName));
        query.where.push({
          type: "optional",
          patterns: [{
            type: "bgp",
            triples: [{
              subject: variable("observation"),
              predicate: component.iri,
              object: variable(bindingName),
            }],
          }],
        });
      });

    if (hasAggregate) {
      query.group = query.variables
        .map((selected: any) => {
          if (selected.hasOwnProperty("value")) {
            groupedOnBindingNames.push(selected.value);
            return {
              expression: selected,
            };
          }/* else {
            groupedOnBindingNames.push(selected.variable.value);
            return {
              expression: selected.variable,
            };
          }*/
        }).filter(Boolean);
      }

    if (this.state.groupBys.length) {
      if (!query.group) {
        query.group = [];
      }
      this.state.groupBys.forEach((groupBy) => {
        let component: Component;
        if (typeof groupBy === "function") {
          component = groupBy(this.state.selects);
        } else {
          component = this.bindingToComponent[groupBy];
        }
        if (!component) {
          throw new Error(`Cannot group on '${groupBy}': no component with this name.`);
        }
        const bindingName = this.iriToBinding[component.iri.value];
        if (!groupedOnBindingNames.includes(bindingName)) {
          groupedOnBindingNames.push(bindingName);
          query.group.push({
            expression: variable(bindingName),
          });
        }
      });
    }

    const generator = new SparqlGenerator({ allPrefixes: true });
    return generator.stringify(query);
  }

  private newTmpVar() {
    return variable(`tmpVar${this.tmpVarCount++}`);
  }
}

export default DataSetQuery;
