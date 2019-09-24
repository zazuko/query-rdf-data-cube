// tslint:disable max-classes-per-file
import { namedNode } from "@rdfjs/data-model";
import clone from "clone";
import { Term } from "rdf-js";
import { Label } from "../datacube";
import { BaseExpr, Binding, IExpr } from "../expressions";

export type SerializedComponent = {
  componentType: string,
  iri: string,
  labels: Label[],
};

/**
 * @class [[Component]] is implemented by [[Dimension]], [[Attribute]] and [[Measure]].
 * @export
 * @abstract
 * @extends {BaseExpr}
 *
 * > A cube is organized according to a set of *dimensions*, *attributes* and *measures*.
 * We collectively call these *components*.
 * Source: <https://www.w3.org/TR/vocab-data-cube/#cubes-model>.
 *
 * Each of them inherits from all filter operators:
 *
 * ```js
 * const priceMeasure = new Measure({
 *   iri: "http://example.com/price",
 *  labels: [
 *    { value: "Price", language: "en" },
 *    { value: "Prix", language: "fr" },
 * ]});
 *
 * const query = dataCube
 *   .query()
 *   .select({ price: priceMeasure })
 *   .filter(({ price }) => price.lte(30.5));
 * ```
 *
 * Generated query will have this `FILTER` clause:
 * ```sparql
 * FILTER(?price <= \\"30.5\\"^^xsd:decimal)
 * ```
 */
export abstract class Component extends BaseExpr {
  /**
   * Deserializes a Component from JSON generated by [[toJSON]]
   *
   * @static
   * @param {string} json
   * @returns {Component}
   * @memberof Component
   */
  public static fromJSON(json: string): Component {
    const obj = JSON.parse(json);
    obj.iri = namedNode(obj.iri);
    switch (obj.componentType) {
      case "measure":
        return new Measure(obj);
      case "dimension":
          return new Dimension(obj);
      case "attribute":
          return new Attribute(obj);
    }
    throw new Error(`Unknown component type '${obj.componentType}'`);
  }

  public labels: Label[];
  public iri: Term;
  public aggregateType: string;
  public isDistinct: boolean = false;
  public descending: boolean = false;
  public componentType: string = "";

  /**
   * Creates an instance of Component.
   * Classes [[Dimension]], [[Attribute]] and [[Measure]] inherit from this [[Component]] abstract class.
   *
   * ```js
   * const priceMeasure = new Measure({
   *   iri: "http://example.com/price", labels: [{ value: "Price", language: "en" }]
   * });
   * ```
   *
   * @param {({ labels?: Label[], iri: string | Term})} options Additional info about the component.
   * @param options.iri - The IRI of the Component.
   * @param options.labels (Optional) A list of labels for the DataCube in the following form:
   * `[ { value: "Something", language: "en" }, { value: "Etwas", language: "de" }, … ]`
   * @memberof Component
   */
  constructor(options: { iri: string | Term, labels?: Label[] }) {
    super();

    const iri = options.iri;
    if (typeof iri === "string") {
      this.iri = namedNode(iri);
    } else {
      this.iri = iri;
    }

    this.labels = options.labels || [];
  }

  /**
   * Serializes a Component to JSON in a way that makes it deserializable
   * by calling [[fromJSON]]
   * @memberof Component
   */
  public toJSON(): string {
    const obj: SerializedComponent = {
      componentType: this.componentType,
      iri: this.iri.value,
      labels: this.labels,
    };
    return JSON.stringify(obj);
  }

  /**
   * @ignore
   */
  public clone() {
    const Constructor = Object.getPrototypeOf(this).constructor;
    const state = {labels: clone(this.labels), iri: this.iri};
    const instance = new Constructor(state);
    instance.aggregateType = this.aggregateType;
    instance.isDistinct = this.isDistinct;
    instance.descending = this.descending;
    return instance;
  }

  /**
   * Used in [[select]], [[avg]] calculates the average value.
   * It automatically generates the corresponding [[groupBy]] clause.
   * An average value can be filter with [[having]].
   *
   * ```js
   * const priceMeasure = new Measure({
   *   iri: "http://example.com/price", labels: [{ value: "Price", language: "en" }]
   * });
   * dataCube.query().select({
   *   price: priceMeasure.avg(),
   * });
   * ```
   *
   * @memberof Component
   */
  public avg() {
    const self = this.clone();
    self.aggregateType = "avg";
    return self;
  }

  /**
   * Used in [[select]], [[distinct]] asks for distinct values.
   *
   * ```js
   * const cityDimension = new Dimension({
   *   iri: "http://example.com/city", labels: [{ value: "City", language: "en" }]
   * });
   * dataCube.query().select({
   *   city: cityDimension.distinct(),
   * });
   * ```
   * @memberof Component
   */
  public distinct() {
    const self = this.clone();
    self.isDistinct = true;
    return self;
  }

  /**
   * Used in [[select]], [[distinct]] asks for distinct values.
   *
   * ```js
   * const priceMeasure = new Measure({
   *   iri: "http://example.com/price", labels: [{ value: "Price", language: "en" }]
   * });
   * dataCube.query().select({
   *   price: priceMeasure
   * }).orderBy(({ price } => price.lte(30.5)));
   * ```
   *
   * @memberof Component
   */
  public desc() {
    const self = this.clone();
    self.descending = true;
    return self;
  }

  /**
   * Mechanism resolving a Component to the corresponding binding name, used when the SPARQL query gets generated.
   *
   * @param {Map<string, string>} mapping
   * @returns {IExpr}
   * @memberof Component
   */
  public resolve(mapping: Map<string, string>): IExpr {
    return new Binding(mapping.get(this.iri.value));
  }
}

export class Attribute extends Component {
  public componentType = "attribute";
}

export class Dimension extends Component {
  public componentType = "dimension";
}

export class Measure extends Component {
  public componentType = "measure";
}
