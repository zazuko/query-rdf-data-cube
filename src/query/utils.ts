import { literal, namedNode, variable } from "@rdfjs/data-model";
import { Variable } from "rdf-js";
import {Component} from "../components";
import { EntryPointOptions } from "../datacubeentrypoint";
import Binding from "../expressions/binding";
import Operator from "../expressions/operator";
import { ArrayExpr, IExpr, into, isTerm, TermExpr } from "../expressions";
import { BindPattern, BlockPattern, Expression, FilterPattern, OperationExpression, Tuple } from "../sparqljs";

export type PredicateFunction = (data: Selects) => Component;
export type Selects = Record<string, Component>;

export interface QueryState {
  selects: Selects;
  filters: IExpr[];
  groupBys: Array<PredicateFunction | string>;
  havings: PredicateFunction[];
  offset: number;
  limit: number;
  order: Component[];
}

// tslint:disable-next-line: no-empty-interface
export interface QueryOptions extends EntryPointOptions {}

export const baseState: QueryState = {
  selects: {},
  filters: [],
  groupBys: [],
  havings: [],
  offset: 0,
  limit: 10,
  order: [],
};

/**
 * Convert [[Operator]] arguments into SPARQL.js `Expression`s
 *
 * @param {Operator} operator
 */
export function operatorArgsToExpressions(args: IExpr[]): Expression[] {
  const expressions = args.map((arg: IExpr): Expression => {
    if (isTerm(arg)) {
      return arg;
    }
    if (arg instanceof Binding) {
      return variable(arg.name);
    }
    if (arg instanceof Operator) {
      return createOperationExpression(arg);
    }
    if (arg instanceof TermExpr) {
      return arg.term;
    }
    if (arg instanceof ArrayExpr) {
      const tuple: Tuple = operatorArgsToExpressions(Array.from(arg.xs).map(into));
      return tuple;
    }
  }).filter((x) => {
    const transformed = Boolean(x);
    if (!transformed) {
      throw new Error("Unrecognized filter argument type");
    }
    return transformed;
  });
  return expressions;
}

export function createOperationExpression(operator: Operator): OperationExpression {
  const operationExpression: OperationExpression = {
    type: "operation",
    operator: operator.operator,
    args: operatorArgsToExpressions(operator.args),
  };
  return operationExpression;
}

/**
 * When `.filter` is called several times, apply a logical AND between all filters.
 */
export function combineFilters(operations: OperationExpression[]): FilterPattern {
  let combined;
  if (operations.length > 1) {
    combined = operations
      .reduce((acc, op) => {
        acc.args.push(op);
        return acc;
      }, {
        operator: "&&",
        type: "operation",
        args: [],
      });
  } else {
    combined = operations[0];
  }
  return {
    type: "filter",
    expression: combined,
  };
}

function langMatchExpression(lang: string, binding: Variable): OperationExpression {
  return {
    type: "operation",
    operator: "langmatches",
    args: [
      {
        type: "operation",
        operator: "lang",
        args: [ binding ],
      },
      literal(lang),
    ],
  };
}

function langExactMatchExpression(lang = "", binding: Variable): OperationExpression {
  return {
    type: "operation",
    operator: "=",
    args: [
      {
        type: "operation",
        operator: "lang",
        args: [ binding ],
      },
      literal(lang),
    ],
  };
}

export function generateLangOptionals(binding: Variable, labelBinding: Variable, langs: string[]): BlockPattern[] {
  return langs.map((lang: string) => {
    const labelLangBinding = variable(`${labelBinding.value}_${lang}`);
    const findLabel: BlockPattern = {
      type: "optional",
      patterns: [
        {
          type: "bgp",
          triples: [
            {
              subject: binding,
              predicate: {
                type: "path",
                pathType: "|",
                items: [
                  namedNode("http://www.w3.org/2000/01/rdf-schema#label"),
                  namedNode("http://www.w3.org/2004/02/skos/core#prefLabel"),
                ],
              },
              object: labelLangBinding,
            },
          ],
        },
        {
          type: "filter",
          expression: lang
            ? langMatchExpression(lang, labelLangBinding)
            : langExactMatchExpression("", labelLangBinding),
        },
      ],
    };
    return findLabel;
  });
}

export function generateLangCoalesce(labelBinding: Variable, langs: string[]): BindPattern {
  const coalesceLabel: BindPattern = {
    type: "bind",
    variable: labelBinding,
    expression: {
      type: "operation",
      operator: "coalesce",
      args: [
        ...langs.map((lang) => variable(`${labelBinding.value}_${lang}`)),
        literal(""),
      ],
    },
  };

  return coalesceLabel;
}

export const prefixes = {
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  qb: "http://purl.org/linked-data/cube#",
  dc11: "http://purl.org/dc/elements/1.1/",
  dcterms: "http://purl.org/dc/terms/",
  skos: "http://www.w3.org/2004/02/skos/core#",
};
