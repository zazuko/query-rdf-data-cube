// tslint:disable: max-classes-per-file
import { literal, namedNode } from "@rdfjs/data-model";
import namespace from "@rdfjs/namespace";
import { Literal, NamedNode } from "rdf-js";
import { IExpr } from "./iexpr";
import { ArrayExpr, IntoExpr, isLiteral, isTerm, TermExpr } from "./utils";

/**
 * @ignore
 */
const xsd = namespace("http://www.w3.org/2001/XMLSchema#");
/**
 * @ignore
 */
const dateRegExp = /^[12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
/**
 * @ignore
 */
const dateTimeRegExp = /^\d{4}(-[01]\d(-[0-3]\d(T[0-2]\d:[0-5]\d:?([0-5]\d(\.\d+)?)?([+-][0-2]\d:[0-5]\d)?Z?)?)?)$/;
/**
 * @ignore
 */
const boolRegExp = /^(true|false)$/;
/**
 * @ignore
 */
const numberRegExp = /^[\-+]?(?:\d+\.?\d*([eE](?:[\-\+])?\d+)|\d*\.?\d+)$/;

/**
 * @ignore
 */
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

/**
 * @ignore
 */
export function toLiteral(arg: any): Literal {
  if (isLiteral(arg)) {
    return arg;
  }
  if (arg === true || arg === false) {
    return literal(String(arg), xsd("boolean"));
  }
  if (boolRegExp.test(arg)) {
    return literal(arg, xsd("boolean"));
  }
  if (arg instanceof Date) {
    return literal(arg.toISOString(), xsd("dateTime"));
  }
  if (dateRegExp.test(arg)) {
    return literal(arg, xsd("date"));
  }
  if (dateTimeRegExp.test(arg)) {
    const date = new Date(arg);
    return literal(date.toISOString(), xsd("dateTime"));
  }
  if (/^[0-9+-]/.test(arg)) {
    const match = numberRegExp.exec(arg);
    if (match) {
      const value = match[0];
      let type: NamedNode;
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

/**
 * @ignore
 */
const combinedNots = {
  "in": "notin",
  "=": "!=",
};

/**
 * @ignore
 * Wraps an operator to make it possible to write `.not.bound()` instead of `.bound().not`.
 * The reason for this is the operators AST. We want to have `bound` as argument of `!`, but
 * `not.bound()` would normally create a `bound` operator with `!` as argument.
 * We can reverse the order of these by "popping" the operators and reversing the top two when
 * we encounter a `not`able operator on top AND a `not` operator right below it.
 */
function notable(operator: string, previous: BaseExpr, extraArgs = []) {
  let op: Operator;
  if (previous instanceof Operator) {
    // operator was preceeded by `.not`
    if (previous.operator === "!") {
      if (combinedNots[operator]) {
        // we have to override, eg. `.not.equals()` becomes `!=` instead of `!` AND `equals`
        return new Operator(combinedNots[operator], [...previous.args, ...extraArgs]);
      }
      op = new Operator(operator, [...previous.args, ...extraArgs]);
      return new Operator("!", [op]);
    }
  }
  return new Operator(operator, [previous, ...extraArgs]);
}

/**
 * @class BaseExpr
 * BaseExpr implements all the filters that can be used on [[Component]]s.
 */
export abstract class BaseExpr implements IExpr {
  /**
   * @ignore
   */
  public resolve(mapping: Map<string, string>): IExpr {
    throw new Error("Not implemented");
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

/**
 * @ignore
 */
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

/**
 * @ignore
 */
export class Binding extends BaseExpr implements IExpr {
  public name: string;

  public constructor(name: string) {
    super();
    this.name = name;
  }
}
