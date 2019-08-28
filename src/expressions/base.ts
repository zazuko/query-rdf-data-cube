import { Literal, Term } from "rdf-js";
import { inspect } from "util";
import { toLiteral } from "../toLiteral";

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

function ensureTerm(arg) {
  if (arg.hasOwnProperty("componentType")) {
    return arg;
  }
  if (isTerm(arg)) {
    return new TermExpr(arg);
  }
  return new TermExpr(toLiteral(arg));
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
    return notable(">=", this, [ensureTerm(arg)]);
  }

  public gt(arg: IntoExpr) {
    return notable(">", this, [ensureTerm(arg)]);
  }

  public lte(arg: IntoExpr) {
    return notable("<=", this, [ensureTerm(arg)]);
  }

  public lt(arg: IntoExpr) {
    return notable("<", this, [ensureTerm(arg)]);
  }

  public in(arg: any) {
    const inArgs = arg.map((term: any) => {
      if (isTerm(term)) {
        return term;
      }
      return toLiteral(term);
    });
    return notable("in", this, [inArgs]);
  }

  public regex(arg: string | Literal, flag: string | Literal) {
    const args = [ensureTerm(arg)];
    if (flag) {
      args.push(ensureTerm(flag));
    }
    return notable("regex", this, args);
  }

  public isIRI(arg: string | Literal) {
    return notable("isiri", this, []);
  }

  public isBlank(arg: string | Literal) {
    return notable("isblank", this, []);
  }

  public isLiteral(arg: string | Literal) {
    return notable("isliteral", this, []);
  }
}

export default BaseExpr;

// for cyclic dependencies
import Operator from "./operator";
import { IExpr, IntoExpr, isTerm, TermExpr } from "./utils";

