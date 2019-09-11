// tslint:disable: max-classes-per-file
import { blankNode, defaultGraph, literal, namedNode, variable } from "@rdfjs/data-model";
import { Literal, Term } from "rdf-js";
import { IExpr } from "./iexpr";

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

export function isLiteral(term: any): term is Literal {
  return (term instanceof literal("").constructor);
}
