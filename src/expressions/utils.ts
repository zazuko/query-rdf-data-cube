// tslint:disable: max-classes-per-file
import { blankNode, defaultGraph, literal, namedNode, variable } from "@rdfjs/data-model";
import namespace from "@rdfjs/namespace";
import { Literal, Term } from "rdf-js";
import { Binding, IExpr, Operator } from "./index";

const xsd = namespace("http://www.w3.org/2001/XMLSchema#");

const dateTime = /^\d{4}(-[01]\d(-[0-3]\d(T[0-2]\d:[0-5]\d:?([0-5]\d(\.\d+)?)?([+-][0-2]\d:[0-5]\d)?Z?)?)?)$/;
const bool = /^(true|false)$/;
const numb = /^[\-+]?(?:\d+\.?\d*([eE](?:[\-\+])?\d+)|\d*\.?\d+)$/;

export type IntoExpr = Term | number | IExpr;

export class TermExpr implements IExpr {
  public term: Term;

  constructor(term: Term) {
    this.term = term;
  }

  public resolve(): TermExpr {
    return this;
  }
}
export class ArrayExpr implements IExpr {
  public xs: Term[];

  constructor(xs: Term[]) {
    this.xs = xs;
  }

  public resolve(mapping: Map<string, string>) {
    return this;
  }
}

export function isTerm(term: any): term is Term {
  return (
    term instanceof namedNode("").constructor ||
    term instanceof literal("").constructor ||
    term instanceof variable("").constructor ||
    term instanceof blankNode().constructor ||
    term instanceof defaultGraph().constructor
  );
}

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
      break;
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

export function isLiteral(term: any): term is Literal {
  return (term instanceof literal("").constructor);
}
