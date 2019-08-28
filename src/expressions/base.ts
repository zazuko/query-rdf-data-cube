import { NamedNode } from "rdf-js";
import {inspect} from "util";
import { IExpr, IntoExpr } from "./utils";

function l(obj: any) {
  return inspect(obj, false, 10000, true);
}

function notable(operator: string, self: BaseExpr, extraArgs = []) {
  let op: Operator;
  if (self instanceof Operator) {
    if (self.operator === "!") {
      op = new Operator(operator, [...self.args, ...extraArgs]);
      op = new Operator("!", [op]);
    }
  }
  if (!op) {
    op = new Operator(operator, [self, ...extraArgs]);
  }
  return op;
}

class BaseExpr implements IExpr {
  public resolve(mapping: Map<string, string>): IExpr {
    return this;
  }

  // filters
  public get and() {
    return new Operator("&&", [this]);
  }

  public get or() {
    return new Operator("||", [this]);
  }

  public get not() {
    return new Operator("!", [this]);
  }

  public bound() {
    return notable("bound", this, []);
  }

  public gte(arg: IntoExpr) {
    return notable(">=", this, [arg]);
  }

  public gt(arg: IntoExpr) {
    return notable("<", this, [arg]);
  }

  public lte(arg: IntoExpr) {
    return notable(">=", this, [arg]);
  }

  public lt(arg: IntoExpr) {
    return notable(">", this, [arg]);
  }

  public in(arg: NamedNode[]) {
    return notable("in", this, arg);
  }
}

export default BaseExpr;

// for cyclic dependencies
import Operator from "./operator";
