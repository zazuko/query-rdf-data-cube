import { Literal } from "rdf-js";
import { IExpr, IntoExpr, Operator } from "./index";

const notableOperators = {
  "in": "notin",
  "=": "!=",
};

function notable(operator: string, previous: BaseExpr, extraArgs = []) {
  let op: Operator;
  if (previous instanceof Operator) {
    if (previous.operator === "!") {
      if (notableOperators[operator]) {
        op = new Operator(notableOperators[operator], [...previous.args, ...extraArgs]);
      } else {
        op = new Operator(operator, [...previous.args, ...extraArgs]);
        op = new Operator("!", [op]);
      }
    }
  }
  if (!op) {
    op = new Operator(operator, [previous, ...extraArgs]);
  }
  return op;
}

export class BaseExpr implements IExpr {
  public resolve(mapping: Map<string, string>): IExpr {
    throw new Error("Not implemented");
  }

  // filters
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
    return notable(">", this, [arg]);
  }

  public lte(arg: IntoExpr) {
    return notable("<=", this, [arg]);
  }

  public lt(arg: IntoExpr) {
    return notable("<", this, [arg]);
  }

  public in(arg: any) {
    return notable("in", this, [arg]);
  }

  public notIn(arg: any) {
    return new Operator("notin", [this, arg]);
  }

  public regex(arg: string | Literal, flag: string | Literal) {
    const args = [arg];
    if (flag) {
      args.push(flag);
    }
    return notable("regex", this, args);
  }

  public isIRI() {
    if (arguments.length !== 0) {
      throw new Error(".isIRI doesn't accept arguments");
    }
    return notable("isiri", this, []);
  }

  public isBlank() {
    if (arguments.length !== 0) {
      throw new Error(".isBlank doesn't accept arguments");
    }
    return notable("isblank", this, []);
  }

  public isLiteral() {
    if (arguments.length !== 0) {
      throw new Error(".isLiteral doesn't accept arguments");
    }
    return notable("isliteral", this, []);
  }

  public lang() {
    if (arguments.length !== 0) {
      throw new Error(".lang doesn't accept arguments");
    }
    return notable("lang", this, []);
  }

  public datatype() {
    if (arguments.length !== 0) {
      throw new Error(".datatype doesn't accept arguments");
    }
    return notable("datatype", this, []);
  }

  public str() {
    if (arguments.length !== 0) {
      throw new Error(".str doesn't accept arguments");
    }
    return notable("str", this, []);
  }

  public sameTerm(arg) {
    if (arguments.length !== 1) {
      throw new Error(".sameTerm expects one argument");
    }
    return notable("sameterm", this, [arg]);
  }

  public equals(arg: string | Literal) {
    if (arguments.length !== 1) {
      throw new Error(".equals expects one argument");
    }
    return notable("=", this, [arg]);
  }

  public notEquals(arg: string | Literal) {
    if (arguments.length !== 1) {
      throw new Error(".notEquals expects one argument");
    }
    return notable("!=", this, [arg]);
  }
}
