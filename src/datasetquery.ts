import { namedNode, variable } from "@rdfjs/data-model";
import clone from "clone";
import { Generator as SparqlGenerator } from "sparqljs";
import Component from "./components/index";
import DataSet from "./dataset";
import Binding from "./expressions/binding";
import Operator from "./expressions/operator";
import { ArrayExpr, IExpr, into, isTerm, TermExpr } from "./expressions/utils";
import SparqlFetcher from "./sparqlfetcher";
import { BgpPattern, Expression, FilterPattern, OperationExpression, SelectQuery, Tuple } from "./sparqljs.d";

type PredicateFunction = (data: Selects) => Component;
type Selects = Record<string, Component>;

interface IState {
  selects: Selects;
  filters: IExpr[];
  groupBys: Array<PredicateFunction | string>;
  havings: PredicateFunction[];
  offset: number;
  limit: number;
}

const baseState: IState = {
  selects: {},
  filters: [],
  groupBys: [],
  havings: [],
  offset: 0,
  limit: 10,
};

/**
 * Convert [[Operator]] arguments into SPARQL.js `Expression`s
 *
 * @param {Operator} operator
 */
function operatorArgsToExpressions(args: IExpr[]): Expression[] {
  const expressions = args.map((arg: IExpr): Expression => {
    if (isTerm(arg)) {
      return arg;
    }
    if (arg instanceof Binding) {
      return variable(arg.name);
    }
    if (arg instanceof Operator) {
      return createOperationExpression(arg);
    }
    if (arg instanceof TermExpr) {
      return arg.term;
    }
    if (arg instanceof ArrayExpr) {
      const tuple: Tuple = operatorArgsToExpressions(Array.from(arg.xs).map(into));
      return tuple;
    }
  }).filter((x) => {
    const transformed = Boolean(x);
    if (!transformed) {
      throw new Error("Unrecognized filter argument type");
    }
    return transformed;
  });
  return expressions;
}

function createOperationExpression(operator: Operator): OperationExpression {
  const operationExpression: OperationExpression = {
    type: "operation",
    operator: operator.operator,
    args: operatorArgsToExpressions(operator.args),
  };
  return operationExpression;
}

/**
 * When `.filter` is called several times, apply a logical AND between all filters.
 */
function combineFilters(operations: OperationExpression[]): FilterPattern {
  let combined;
  if (operations.length > 1) {
    combined = operations
      .reduce((acc, op) => {
        acc.args.push(op);
        return acc;
      }, {
        operator: "&&",
        type: "operation",
        args: [],
      });
  } else {
    combined = operations[0];
  }
  return {
    type: "filter",
    expression: combined,
  };
}

/**
 * A query to a [[DataSet]].
 * @class DataSetQuery
 */
class DataSetQuery {
  private dataSet: DataSet;
  // one map from bindingName to Component, one from component IRI to bindingName
  private bindingToComponent: Map<string, Component> = new Map();
  private iriToBinding: Map<string, string> = new Map();
  private state: IState;
  private fetcher: SparqlFetcher;
  private tmpVarCount: number = 0;

  /**
   * Creates an instance of DataSetQuery. You should not have to manually create queries,
   * call `dataSet.query()` instead since it will automatically pass data about the [[DataSet]]
   * to query.
   * @param dataSet The [[DataSet]] to query.
   */
  constructor(dataSet: DataSet) {
    this.dataSet = dataSet;
    this.state = baseState;
    this.fetcher = new SparqlFetcher(this.dataSet.endpoint);
  }

  /**
   * Decide what data needs to be returned by the query. An object with binding
   * names as keys and [[Component]] ([[Dimension]]/[[Attribute]]/[[Measure]]) as values.
   *
   * ```js
   * myDataSet
   *   .query()
   *   .select({
   *     someDate: dateDimension,
   *   });
   * ```
   * @param {IState["selects"]} selects
   */
  public select(selects: IState["selects"]) {
    const self = this.clone();
    Object.assign(self.state.selects, selects);
    Object.entries(self.state.selects).forEach(([bindingName, component]) => {
      self.bindingToComponent.set(bindingName, component);
      self.iriToBinding.set(component.iri.value, bindingName);
      self.state.selects[bindingName] = component;
    });
    return self;
  }

  /**
   * Filter the results.
   * ```js
   * myDataSet
   *   .query()
   *   .select({
   *     someDate: dateDimension,
   *   })
   *   .filter(dateDimension.not.equals("2019-08-29T07:27:56.241Z"));
   * ```
   * @param filter
   */
  public filter(filter: IExpr) {
    const self = this.clone();
    self.state.filters.push(filter);
    return self;
  }

  /**
   * Aggregate the results. Pass it a binding name used in `.select()` or a function
   * `({ bindingName }) => bindingName`
   * ```js
   * myDataSet
   *   .query()
   *   .select({
   *     someDimension: myDimension,
   *   })
   *   // syntax 1:
   *   .groupBy("someDimension")
   *   // syntax 2:
   *   .groupBy(({ someDimension }) => someDimension)
   * ```
   * @param {(PredicateFunction | string)} grouper
   */
  public groupBy(grouper: PredicateFunction | string) {
    const self = this.clone();
    self.state.groupBys.push(grouper);
    return self;
  }

  public having(fn: PredicateFunction) {
    const self = this.clone();
    self.state.havings.push(fn);
    return self;
  }

  /**
   * Limit the number of results to return. Defaults to `10`.
   *
   * @param {number} How many results to return.
   */
  public limit(limit: number) {
    const self = this.clone();
    self.state.limit = limit;
    return self;
  }

  /**
   * Results offset, number of results to ignore before returning the results.
   * Defaults to `0`. Usually used together with `.limit`.
   *
   * ```js
   * // return results 50 to 75
   * myDataSet
   *   .query()
   *   .limit(25)
   *   .offset(50);
   * ```
   * @param {number} How many results to return.
   */
  public offset(offset: number) {
    const self = this.clone();
    self.state.offset = offset;
    return self;
  }

  public applyFilters(): FilterPattern {
    const selects = this.state.selects;
    const filters = this.state.filters
      .map((op) => op.resolve(this.iriToBinding))
      .map(createOperationExpression);
    const filterExpression = combineFilters(filters);
    return filterExpression;
  }

  /**
   * Executes the SPARQL query against the dataset and returns the results.
   */
  public async execute(): Promise<any[]> {
    const query = await this.toSparql();
    const results = await this.fetcher.select(query);
    if (results.every((obj) => obj.key && obj.value)) {
      const error = results.reduce((obj, {key, value}) => {
        obj[key] = value;
        return obj;
      }, {});
      throw new Error(`${error.code}: ${error.message}\n--------\n${await this.toSparql()}\n--------`);
    }
    return results.map((result) =>
      Object.entries(result).reduce((obj, [key, val]) => {
        /**
         * Instead of this:
         * ```js
         * raum: NamedNode {
         *   value: 'https://ld.stadt-zuerich.ch/statistics/code/R30000'
         * },
         * raumLabel: Literal {
         *   value: 'Stadt Zürich (ab 1934)',
         * },
         * quelle: NamedNode {
         *   value: 'https://ld.stadt-zuerich.ch/statistics/quelle/SSD002'
         * },
         * ```
         * we want this:
         * ```js
         * raum: {
         *   value: NamedNode {
         *     value: 'https://ld.stadt-zuerich.ch/statistics/code/R30000'
         *   },
         *   label: Literal {
         *     value: 'Stadt Zürich (ab 1934)',
         *   }
         * },
         * quelle: {
         *   value: NamedNode {
         *     value: 'https://ld.stadt-zuerich.ch/statistics/quelle/SSD002'
         *   }
         * },
         * ```
         */
        const isLabel = key.endsWith("Label");
        let finalKey = key;
        if (isLabel) {
          finalKey = key.substr(0, key.length - "Label".length);
        }
        const finalObj = obj.hasOwnProperty(finalKey) ? obj[finalKey] : {};

        if (isLabel) {
          finalObj.label = val;
        } else {
          finalObj.value = val;
        }

        Object.assign(obj, {[finalKey]: finalObj});
        return obj;
      }, {}));
  }

  /**
   * Generates and returns the actual SPARQL query that would be `.execute()`d.
   * Use it to preview the SPARQL query, to make sure your code generates what you
   * think it does.
   * @returns {Promise<string>} SPARQL query
   */
  public async toSparql(): Promise<string> {
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
    const fetchLabels = [];

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
      offset: this.state.offset,
      limit: this.state.limit,
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
        // fetch labels when they exist
        const labelBinding = variable(`${bindingName}Label`);
        fetchLabels.push({
          type: "optional",
          patterns: [{
            type: "bgp",
            triples: [{
              subject: variable(bindingName),
              predicate: {
                type: "path",
                pathType: "|",
                items: [
                  namedNode("http://www.w3.org/2000/01/rdf-schema#label"),
                  namedNode("http://www.w3.org/2004/02/skos/core#prefLabel"),
                ],
              },
              object: labelBinding,
            }],
          }],
        });
        query.variables.push(variable(bindingName), labelBinding);
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
        if (!hasAggregate && !hasDistinct) {
          query.variables.push(variable(tmpVar.value));
        }
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

    mainWhereClauses.triples.push({
      subject: variable("observation"),
      predicate: namedNode("http://purl.org/linked-data/cube#dataSet"),
      object: namedNode(this.dataSet.iri),
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

    query.where.push(...fetchLabels);

    if (this.state.filters.length) {
      query.where.push(this.applyFilters());
    }

    if (hasAggregate) {
      query.group = query.variables
        .map((selected: any) => {
          if (selected.hasOwnProperty("value")) {
            groupedOnBindingNames.push(selected.value);
            return {
              expression: selected,
            };
          }
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
      // all variables in projection should be present in GROUP BY
      query.variables
        .forEach((selected: any) => {
          if (selected.hasOwnProperty("value") && !groupedOnBindingNames.includes(selected.value)) {
            groupedOnBindingNames.push(selected.value);
            query.group.push({
              expression: variable(selected.value),
            });
          }
        });
    }

    const generator = new SparqlGenerator({ allPrefixes: true });
    return generator.stringify(query);
  }

  private clone() {
    const dsq = new DataSetQuery(this.dataSet);
    dsq.state = clone(this.state);
    dsq.iriToBinding = clone(this.iriToBinding);
    dsq.bindingToComponent = clone(this.bindingToComponent);
    return dsq;
  }

  private newTmpVar() {
    return variable(`tmpVar${this.tmpVarCount++}`);
  }
}

export default DataSetQuery;
