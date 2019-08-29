import { literal, namedNode } from "@rdfjs/data-model";
import { Term } from "rdf-js";
import BaseExpr from "../expressions/base";
import Binding from "../expressions/binding";
import { IExpr } from "../expressions/utils";

class Component extends BaseExpr {
  public label: Term;
  public iri: Term;
  public aggregateType: string;
  public isDistinct: boolean = false;
  public componentType: string = "";

  constructor({ label, iri }: { label: string | Term, iri: string | Term}) {
    super();
    if (typeof label === "string") {
      this.label = literal(label);
    } else {
      this.label = label;
    }
    if (typeof iri === "string") {
      this.iri = namedNode(iri);
    } else {
      this.iri = iri;
    }
  }

  public clone() {
    const Constructor = Object.getPrototypeOf(this).constructor;
    const state = {label: this.label, iri: this.iri};
    const instance = new Constructor(state);
    instance.aggregateType = this.aggregateType;
    instance.isDistinct = this.isDistinct;
    return instance;
  }

  public avg() {
    const self = this.clone();
    self.aggregateType = "avg";
    return self;
  }

  public distinct() {
    const self = this.clone();
    self.isDistinct = true;
    return self;
  }

  public resolve(mapping: Map<string, string>): IExpr {
    return new Binding(mapping.get(this.iri.value));
  }
}

export default Component;
import Attribute from "./attribute";
import Dimension from "./dimension";
import Measure from "./measure";
export {
  Dimension,
  Attribute,
  Measure,
};
