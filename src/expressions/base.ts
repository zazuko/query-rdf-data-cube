import { Literal } from "rdf-js";
import { toLiteral } from "../toLiteral";

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

class BaseExpr implements IExpr {
  public resolve(mapping: Map<string, string>): IExpr {
    return this;
  }

  // filters
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
      const iriRegExp = new RegExp("^https?://");
      if (typeof term === "string" && iriRegExp.test(term)) {
        return namedNode(term);
      }
      return toLiteral(term);
    });
    return notable("in", this, [inArgs]);
  }

  public notIn(arg: any) {
    const inArgs = arg.map((term: any) => {
      if (isTerm(term)) {
        return term;
      }
      const iriRegExp = new RegExp("^https?://");
      if (typeof term === "string" && iriRegExp.test(term)) {
        return namedNode(term);
      }
      return toLiteral(term);
    });
    return new Operator("notin", [this, inArgs]);
  }

  public regex(arg: string | Literal, flag: string | Literal) {
    const args = [ensureTerm(arg)];
    if (flag) {
      args.push(ensureTerm(flag));
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
    return notable("sameterm", this, [ensureTerm(arg)]);
  }

  public equals(arg: string | Literal) {
    if (arguments.length !== 1) {
      throw new Error(".equals expects one argument");
    }
    return notable("=", this, [ensureTerm(arg)]);
  }

  public notEquals(arg: string | Literal) {
    if (arguments.length !== 1) {
      throw new Error(".notEquals expects one argument");
    }
    return notable("!=", this, [ensureTerm(arg)]);
  }
}

export default BaseExpr;

// for cyclic dependencies
import Operator from "./operator";
import { ensureTerm, IExpr, IntoExpr, isTerm } from "./utils"; import { namedNode } from "@rdfjs/data-model";

