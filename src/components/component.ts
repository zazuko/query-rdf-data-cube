import { namedNode } from "@rdfjs/data-model";
import clone from "clone";
import { Term } from "rdf-js";
import { Label } from "../dataset";
import BaseExpr from "../expressions/base";
import Binding from "../expressions/binding";
import { IExpr } from "../expressions/utils";

class Component extends BaseExpr {
  public labels: Label[];
  public iri: Term;
  public aggregateType: string;
  public isDistinct: boolean = false;
  public descending: boolean = false;
  public componentType: string = "";

  constructor({ labels, iri }: { labels: Label[], iri: string | Term}) {
    super();

    this.labels = labels || [];
    if (typeof iri === "string") {
      this.iri = namedNode(iri);
    } else {
      this.iri = iri;
    }
  }

  public clone() {
    const Constructor = Object.getPrototypeOf(this).constructor;
    const state = {labels: clone(this.labels), iri: this.iri};
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

  public desc() {
    const self = this.clone();
    self.descending = true;
    return self;
  }

  public resolve(mapping: Map<string, string>): IExpr {
    return new Binding(mapping.get(this.iri.value));
  }
}

export default Component;
