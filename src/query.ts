import { namedNode, variable } from "@rdfjs/data-model";
import clone from "clone";
import nodeSlugify from "node-slugify";
import { Literal, NamedNode, Variable } from "rdf-js";
import { Generator as SparqlGenerator } from "sparqljs";
import { Component } from "./components";
import { isComponent } from "./components/component";
import { DataCube } from "./datacube";
import { BaseOptions } from "./entrypoint";
import { IExpr, Operator } from "./expressions";
import { combineFilters, createOperationExpression, labelPredicate, prefixes } from "./queryutils";
import { generateLangCoalesce, generateLangOptionals } from "./queryutils";
import { SparqlFetcher } from "./sparqlfetcher";
import { BgpPattern, FilterPattern, Ordering, SelectQuery, VariableExpression, Wildcard } from "./sparqljs";

type PredicateFunction = (data: SelectsObj) => Component;
type PredicatesFunction = (data: SelectsObj) => Component[];
type FilterFunction = (data: SelectsObj) => Operator;
type SelectsObj = Record<string, Component>;
type SelectsArr = Array<Array<string | Component>>;

/**
 * @ignore
 */
interface QueryState {
  selects: SelectsObj;
  filters: IExpr[];
  groupBys: Array<PredicateFunction | string>;
  havings: PredicateFunction[];
  offset: number;
  limit: number | null;
  distinct: boolean;
  order: Component[];
}

// tslint:disable-next-line: no-empty-interface
export interface QueryOptions extends BaseOptions {}

/**
 * @ignore
 */
const baseState: QueryState = {
  selects: {},
  filters: [],
  groupBys: [],
  havings: [],
  offset: 0,
  limit: 10,
  distinct: false,
  order: [],
};

/**
 * @ignore
 */
function isVariables(variables: Array<Variable|VariableExpression|Wildcard>): variables is Variable[] {
  return true;
}

/**
 * Slugifies into camelCase
 *
 * @param {string} str
 * @returns {string}
 */
function slugify(str: string): string {
  return nodeSlugify(str)
    .split("-")
    .map((part: string, i: number) => i === 0 ? part : part[0].toUpperCase() + part.substring(1))
    .join("");
}

/**
 * A query to a [[DataCube]].
 * @class Query
 * @param options Options
 * @param options.languages Languages in which to get the labels, by priority, e.g. `["de", "en"]`.
 * Inherited from [[DataCubeEntryPoint]].
 */
export class Query {
  private dataCube: DataCube;
  // one map from bindingName to Component, one from component IRI to bindingName
  private bindingToComponent: Map<string, Component> = new Map();
  private iriToBinding: Map<string, string> = new Map();
  private state: QueryState;
  private fetcher: SparqlFetcher;
  private tmpVarCount: number = 0;
  private languages: string[];

  /**
   * Creates an instance of Query. You should not have to manually create queries,
   * call `dataCube.query()` instead since it will automatically pass data about the [[DataCube]]
   * to query.
   * @param dataCube The [[DataCube]] to query.
   */
  constructor(dataCube: DataCube, options: QueryOptions = {}) {
    this.languages = options.languages || [];
    this.dataCube = dataCube;
    this.state = baseState;
    this.fetcher = new SparqlFetcher(this.dataCube.endpoint);
  }

  /**
   * Decide what data needs to be returned by the query.
   *
   * ```js
   * myDataCube
   *   .query()
   *   .select({
   *     someDate: dateDimension,
   *   });
   * ```
   * @param {SelectsObj | SelectsArr} selects Either object with binding names as keys
   * and [[Component]] ([[Dimension]]/[[Attribute]]/[[Measure]]) as values,
   * or an array of arrays: `[["bindingName", aComponent], …]`
   */
  public select(selects: SelectsObj | SelectsArr) {
    const self = this.clone();
    let newSelects = {};
    if (Array.isArray(selects)) {
      selects.forEach(([bindingName, component]) => {
        if (typeof bindingName !== "string") {
          const errorMessage = [
            "Binding name should be a string in:",
            `\`.select([[bindingName, ${component}]])\``,
            `           ^^^^^^^^^^^`,
          ].join("\n");
          throw new Error(errorMessage);
        }
        if (!isComponent(component)) {
          const errorMessage = [
            "'component' should be a Component in:",
            `\`.select([["${bindingName}", component]])\``,
            `               ${" ".repeat(bindingName.length)}^^^^^^^^^`,
          ].join("\n");
          throw new Error(errorMessage);
        }
        newSelects[bindingName] = component;
      });
    } else {
      newSelects = selects;
    }
    Object.assign(self.state.selects, newSelects);
    Object.entries(self.state.selects).forEach(([bindingName, component]: [string, Component]) => {
      if (!component) {
        const errorMessage = [
          "Invalid Component in",
          `\`.select({ ${bindingName}: someFalsyValue })\``,
          `             ${" ".repeat(bindingName.length)}^^^^^^^^^^^^^^`,
        ].join("\n");
        throw new Error(errorMessage);
      }
      self.bindingToComponent.set(bindingName, component);
      self.iriToBinding.set(component.iri.value, bindingName);
      self.state.selects[bindingName] = component;
    });
    return self;
  }

  /**
   * Filter the results.
   * ```js
   * myDataCube
   *   .query()
   *   .select({
   *     someDate: dateDimension,
   *   })
   *   // syntax 1:
   *   .filter(({ someDate }) => someDate.not.equals("2019-08-29T07:27:56.241Z"));
   *   // syntax 2:
   *   .filter(dateDimension.not.equals("2019-08-29T07:27:56.241Z"));
   *   // syntax 3:
   *   .filter([dateDimension.not.equals("2019-08-29T07:27:56.241Z"), secondFilter, thirdFilter, moreFilters]);
   * ```
   * @param filter
   */
  public filter(filter: IExpr | FilterFunction | Array<IExpr | FilterFunction>) {
    const self = this.clone();
    let newFilters = [];
    if (Array.isArray(filter)) {
      newFilters = filter;
    } else {
      newFilters.push(filter);
    }
    newFilters.forEach((newFilter) => {
      if (typeof filter === "function") {
        newFilter = filter(this.state.selects);
      }
      self.state.filters.push(newFilter);
    });
    return self;
  }

  /**
   * Aggregate the results. Pass it a binding name used in `.select()` or a function
   * `({ bindingName }) => bindingName`
   * ```js
   * myDataCube
   *   .query()
   *   .select({
   *     someDimension: myDimension,
   *   })
   *   // syntax 1:
   *   .groupBy(({ someDimension }) => someDimension)
   *   // syntax 2:
   *   .groupBy("someDimension")
   * ```
   * @param {PredicateFunction | string} grouper
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
   * Only return distinct values.
   *
   * @param {boolean} Enable/disable `DISTINCT`.
   */
  public distinct(distinct: boolean = true) {
    const self = this.clone();
    self.state.distinct = distinct;
    return self;
  }

  /**
   * Limit the number of results to return. Defaults to `10`, even when `.limit()` is not used.
   * Use `.limit(null)` to remove the default limit and get all results.
   *
   * @param {number|null} How many results to return. `null` removes the limit.
   */
  public limit(limit: number | null) {
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
   * myDataCube
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

  /**
   * Adds one or many orderings to the results.
   *
   * ```js
   * // order by `myVar DESC, otherVar`
   * myDataCube
   *   .query({
   *      myVar: someDimension,
   *      otherVar: otherDimension,
   *    })
   *    // this:
   *   .orderBy(({ myVar, otherVar }) => [myVar.desc(), otherVar]);
   *   // is equivalent to:
   *   .orderBy(someDimension.desc())
   *   .orderBy(otherDimension);
   *   // and equivalent to:
   *   .orderBy(someDimension.desc(), otherDimension);
   * ```
   */
  public orderBy(...orderings: Component[] | PredicatesFunction[]) {
    const self = this.clone();
    for (const ordering of orderings) {
      if (typeof ordering === "function") {
        self.state.order.push(...ordering(this.state.selects));
      } else {
        self.state.order.push(ordering);
      }
    }
    return self;
  }

  /**
   * @ignore
   */
  public applyFilters(): FilterPattern {
    const filters = this.state.filters
      .map((op) => op.resolve(this.iriToBinding))
      .map(createOperationExpression);
    const filterExpression = combineFilters(filters);
    return filterExpression;
  }

  /**
   * Executes the SPARQL query against the dataCube and returns the results.
   */
  public async execute(): Promise<any[]> {
    const query = await this.toSparql();
    const results = await this.fetcher.select(query);
    if (results.length && results.every((obj) => obj.key && obj.value)) {
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
   * Retrieve all the possible values a [[Component]] ([[Dimension]], [[Measure]], [[Attribute]]) can have.
   * See also [[DataCube.componentValues]] and the examples folder.
   * ```js
   * const sizeValues = await dataCube.query()
   *   .select({ size: sizeDimension })
   *   .filter(({ size }) => size.gt(50))
   *   .filter(({ size }) => size.lte(250))
   *   .componentValues();
   * ```
   *
   * @returns {Promise<Array<{label: Literal, value: NamedNode}>>}
   */
  public async componentValues(): Promise<Array<{label: Literal, value: NamedNode}>> {
    const self = this.clone();
    self.state.limit = undefined;
    self.state.offset = undefined;
    self.state.distinct = true;
    const query = await self.toSparql();
    const results = await self.fetcher.select(query);
    if (!results.length) {
      return [];
    }
    const keys = Object.keys(results[0]);
    const labelKey = keys.find((key) => key.endsWith("Label"));
    const valueKey = keys.find((key) => !key.endsWith("Label"));
    return results.reduce((acc, row) => {
      acc.push({
        label: row[labelKey],
        value: row[valueKey],
      });
      return acc;
    }, []);
  }

  /**
   * Retrieve the maximal and minimal values of a [[Component]] ([[Dimension]], [[Measure]], [[Attribute]]).
   * See also [[DataCube.componentMinMax]] and the examples folder.
   * ```js
   * const values = await dataCube.componentMinMax(sizeDimensions);
   * // values = { min: literal(10), max: literal(600) }
   * const { min: sizeMin, max: sizeMax } = await dataCube.query()
   *   .select({ size: sizeDimension })
   *   .filter(({ size }) => size.gt(50))
   *   .filter(({ size }) => size.lte(250))
   *   .componentMinMax();
   * // sizeMin = 60, sizeMax = 250
   * ```
   *
   * @returns Promise<{min: Literal|null, max: Literal|null}>
   */
  public async componentMinMax(): Promise<{min: Literal|null, max: Literal|null}> {
    const self = this.clone();
    self.state.limit = undefined;
    self.state.offset = undefined;
    self.state.distinct = false;
    const query: SelectQuery = await self.toSparqlJS();
    if (!isVariables(query.variables) || !query.variables.length) {
      throw new Error("Nothing selected");
    }
    const binding: Variable = query.variables.find((v: Variable) => !v.value.endsWith("Label"));
    query.variables = [
      {
        expression: {
          expression: binding,
          type: "aggregate",
          aggregation: "min",
          distinct: false,
        },
        variable: variable("min"),
      },
      {
        expression: {
          expression: binding,
          type: "aggregate",
          aggregation: "max",
          distinct: false,
        },
        variable: variable("max"),
      },
    ];
    query.where = query.where.filter((wherePart) => {
      if (wherePart.type === "bind" && wherePart.variable && wherePart.variable.value.endsWith("Label")) {
        return false;
      }
      return true;
    });
    query.where.push({
      type: "filter",
      expression: {
        type: "operation",
        operator: "isliteral",
        args: [binding],
      },
    });

    const results = await self.fetcher.select(await this.toSparql(query));
    if (results.length) {
      return results[0];
    }
    return { min: null, max: null };
  }

  /**
   * Generates the sparql.js select query that will be stringified to a SPARQL
   * string by [[toSparql]].
   * @returns {Promise<SelectQuery>} sparql.js select query
   */
  public async toSparqlJS(): Promise<SelectQuery> {
    const hasDistinct = this.state.distinct;
    let hasAggregate = false;
    Object.values(this.state.selects).forEach((component) => {
      if (component.aggregateType) {
        hasAggregate = true;
      }
    });
    const groupedOnBindingNames = [];
    const addedDimensionsIRIs = [];
    const fetchLabels = [];

    const query: SelectQuery = {
      prefixes,
      queryType: "SELECT",
      variables:  [],
      from: {
        default: [
          namedNode(this.dataCube.graphIri),
        ],
        named: [],
      },
      distinct: hasDistinct,
      where: [],
      offset: this.state.offset,
      limit: this.state.limit,
      type: "query",
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
        this.bindingToComponent.set(bindingName, component);
        this.iriToBinding.set(component.iri.value, bindingName);
        const binding = variable(bindingName);

        addedDimensionsIRIs.push(component.iri.value);
        mainWhereClauses.triples.push({
          subject: variable("observation"),
          predicate: component.iri,
          object: binding,
        });

        const labelBinding = variable(`${bindingName}Label`);
        const langOptional = generateLangOptionals(binding, labelBinding, labelPredicate, this.languages);
        const langCoalesce = generateLangCoalesce(labelBinding, this.languages);
        fetchLabels.push(...langOptional, langCoalesce);
        query.variables.push(binding, labelBinding);
      });

    // add dimensions that haven't been explicitly selected
    const dimensions = await this.dataCube.dimensions();
    dimensions
      .filter(({ iri }) => !addedDimensionsIRIs.includes(iri.value))
      .forEach((component) => {
        const tmpVar = this.autoNameVariable(component);
        this.bindingToComponent.set(tmpVar.value, component);
        this.iriToBinding.set(component.iri.value, tmpVar.value);
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
        this.bindingToComponent.set(bindingName, component);
        this.iriToBinding.set(component.iri.value, bindingName);
        if (component.aggregateType) {
          const tmpVar = this.autoNameVariable(component, component.aggregateType);
          query.variables.push({
            expression: {
              expression: tmpVar,
              type: "aggregate",
              aggregation: component.aggregateType,
              distinct: component.isDistinct,
            },
            variable: variable(bindingName),
          });

          mainWhereClauses.triples.push({
            subject: variable("observation"),
            predicate: component.iri,
            object: tmpVar,
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
      object: namedNode(this.dataCube.iri),
    });
    query.where.push(mainWhereClauses);

    Object.entries(this.state.selects)
      .filter(([, component]) => component.componentType === "attribute")
      .forEach(([bindingName, component]) => {
        this.bindingToComponent.set(bindingName, component);
        this.iriToBinding.set(component.iri.value, bindingName);
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
            return { expression: selected };
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
          component = this.bindingToComponent.get(groupBy);
        }
        if (!component) {
          throw new Error(`Cannot group on '${groupBy}': no component with this name.`);
        }
        const bindingName = this.iriToBinding.get(component.iri.value);
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

    // order by
    if (this.state.order.length) {
      query.order = [];
    }
    this.state.order.forEach((component) => {
      const bindingName = this.iriToBinding.get(component.iri.value);
      const order: Ordering = {
        expression: variable(bindingName),
      };
      if (component.descending) {
        order.descending = true;
      }
      query.order.push(order);
    });

    return query;
  }

  /**
   * Generates and returns the actual SPARQL query that would be `.execute()`d.
   * Use it to preview the SPARQL query, to make sure your code generates what you
   * think it does.
   * @returns {Promise<string>} SPARQL query
   */
  public async toSparql(sparqlJS?: SelectQuery): Promise<string> {
    const sparqlJSQuery = sparqlJS || await this.toSparqlJS();

    const generator = new SparqlGenerator({ allPrefixes: true });
    return generator.stringify(sparqlJSQuery);
  }

  private clone() {
    const dsq = new Query(this.dataCube);
    dsq.bindingToComponent = clone(this.bindingToComponent);
    dsq.iriToBinding = clone(this.iriToBinding);
    dsq.state = clone(this.state);
    dsq.fetcher = clone(this.fetcher);
    dsq.tmpVarCount = clone(this.tmpVarCount);
    dsq.languages = clone(this.languages);
    return dsq;
  }

  private autoNameVariable(component: Component, suffix?: string) {
    let potentialName = "";

    // try to use the label
    const language = this.languages.length ? this.languages[0] : "";
    const label = component.labels.find((lab) => lab.language === language);
    if (label && label.value) {
      potentialName = label.value;
    } else {
      // otherwise use the part of component IRI after # or after the last /
      const iri = component.iri.value;
      const afterHash = iri.substr(iri.lastIndexOf("#") + 1);
      const afterSlash = iri.substr(iri.lastIndexOf("/") + 1);
      potentialName = afterHash !== iri ? afterHash : afterSlash;
      // in cases where the IRI is like one of these:
      // http://example.org/foo/dimension/4
      // http://example.org/foo/property#4
      // naming the variable ?4 isn't helpful, prefix it with component type:
      // ?dimension4
      if (String(parseInt(potentialName, 10)) === potentialName) {
        potentialName = component.componentType + potentialName;
      }
    }
    if (suffix) {
      potentialName += ` ${suffix}`;
    }
    potentialName = slugify(potentialName);

    // while the name conflicts with an existing binding, add a number at the end or increment existing number
    while (this.bindingToComponent.has(potentialName)) {
      const match = potentialName.match(/(\d+)$/);
      if (!match) {
        potentialName += "1";
      } else {
        potentialName = potentialName.replace(/(\d+)$/, String(parseInt(match[1], 10) + 1));
      }
    }
    return variable(potentialName);
  }
}
