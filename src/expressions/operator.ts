// tslint:disable: max-classes-per-file
import { literal, namedNode } from "@rdfjs/data-model";
import namespace from "@rdfjs/namespace";
import { Literal } from "rdf-js";
import { IExpr } from "./iexpr";
import { ArrayExpr, IntoExpr, isLiteral, isTerm, TermExpr } from "./utils";

const xsd = namespace("http://www.w3.org/2001/XMLSchema#");

const dateTime = /^\d{4}(-[01]\d(-[0-3]\d(T[0-2]\d:[0-5]\d:?([0-5]\d(\.\d+)?)?([+-][0-2]\d:[0-5]\d)?Z?)?)?)$/;
const bool = /^(true|false)$/;
const numb = /^[\-+]?(?:\d+\.?\d*([eE](?:[\-\+])?\d+)|\d*\.?\d+)$/;

export function into(what: IntoExpr): IExpr {
  switch (typeof what) {
    case "number":
      return new TermExpr(toLiteral(what));
    case "string":
      const iriRegExp = new RegExp("^https?://");
      if (typeof what === "string" && iriRegExp.test(what)) {
        return new TermExpr(namedNode(what));
      }
      return new TermExpr(toLiteral(what));
    case "object":
      if (
        what instanceof Operator ||
        what instanceof Binding ||
        what instanceof TermExpr ||
        what instanceof ArrayExpr
      ) {
        return what;
      }
      if (Array.isArray(what)) {
        return new ArrayExpr(what);
      }
      if (isTerm(what)) {
        return new TermExpr(what);
      }
      if (what.hasOwnProperty("componentType")) {
        return what;
      }
  }

  console.error(what);
  throw new Error(`into() cannot cast arg ${JSON.stringify(what)}`);
}

export function toLiteral(arg): Literal {
  if (isLiteral(arg)) {
    return arg;
  }
  if (arg === true || arg === false) {
    return literal(String(arg), xsd("boolean"));
  }
  if (bool.test(arg)) {
    return literal(arg, xsd("boolean"));
  }
  if (arg instanceof Date) {
    return literal(arg.toISOString(), xsd("dateTime"));
  }
  if (dateTime.test(arg)) {
    const date = new Date(arg);
    return literal(date.toISOString(), xsd("dateTime"));
  }
  if (/^[0-9+-]/.test(arg)) {
    const match = numb.exec(arg);
    if (match) {
      const value = match[0];
      let type;
      if (match[1]) {
        type = xsd("double");
      } else if (/^[+\-]?\d+$/.test(match[0])) {
        type = xsd("integer");
      } else {
        type = xsd("decimal");
      }
      return literal(String(value), type);
    }
  }
  return literal(arg);
}

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

  public regex(arg: string | Literal, flag?: string | Literal) {
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

  public equals(arg: any) {
    if (arguments.length !== 1) {
      throw new Error(".equals expects one argument");
    }
    return notable("=", this, [arg]);
  }

  public notEquals(arg: any) {
    if (arguments.length !== 1) {
      throw new Error(".notEquals expects one argument");
    }
    return notable("!=", this, [arg]);
  }
}

export class Operator extends BaseExpr implements IExpr {
  public operator: string;
  public args: IExpr[];

  public constructor(operator: string, args: IntoExpr[]) {
    super();
    this.operator = operator;
    this.args = args.map(into);
  }

  public resolve(mapping: Map<string, string>): Operator {
    return new Operator(this.operator, this.args.map((arg) => arg.resolve(mapping)));
  }
}

export class Binding extends BaseExpr implements IExpr {
  public name: string;

  public constructor(name: string) {
    super();
    this.name = name;
  }
}
