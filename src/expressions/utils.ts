// tslint:disable: max-classes-per-file
import { blankNode, defaultGraph, literal, namedNode, variable } from "@rdfjs/data-model";
import { NamedNode, Term } from "rdf-js";
import { toLiteral } from "../toLiteral";
import Binding from "./binding";
import Numeric from "./numeric";
import Operator from "./operator";

export interface IExpr {
  resolve(mapping: Map<string, string>): IExpr;
}
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
