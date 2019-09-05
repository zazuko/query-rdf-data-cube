import { literal, namedNode, variable } from "@rdfjs/data-model";
import { Variable } from "rdf-js";
import Component from "../components";
import { ICubeOptions } from "../datacube";
import Binding from "../expressions/binding";
import Operator from "../expressions/operator";
import { ArrayExpr, IExpr, into, isTerm, TermExpr } from "../expressions/utils";
import { BindPattern, BlockPattern, Expression, FilterPattern, OperationExpression, Tuple } from "../sparqljs";

export type PredicateFunction = (data: Selects) => Component;
export type Selects = Record<string, Component>;

export interface IState {
  selects: Selects;
  filters: IExpr[];
  groupBys: Array<PredicateFunction | string>;
  havings: PredicateFunction[];
  offset: number;
  limit: number;
  order: Component[];
}

// tslint:disable-next-line: no-empty-interface
export interface IQueryOptions extends ICubeOptions {}

export const baseState: IState = {
  selects: {},
  filters: [],
  groupBys: [],
  havings: [],
  offset: 0,
  limit: 10,
  order: [],
};

export interface ILangBindings {
  binding: Variable;
  labelBinding: Variable;
  labelLangBinding: Variable;
}

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

function langFilter(labelLangBinding: Variable, langs: string[]): FilterPattern {
  let languages = langs.filter(Boolean);
  if (!languages.length) {
    // no lang specified, default to 'empty' lang
    return {
      type: "filter",
      expression: langExactMatchExpression("", labelLangBinding),
    };
  }

  // at least one non-empty lang, add the 'empty' lang as fallback
  languages = langs.concat("");
  // we now have at least two langs to work with
  const lang1 = languages.shift();
  const lang2 = languages.shift();

  let expression: OperationExpression = {
    type: "operation",
    operator: "||",
    args: [
      lang1 === "" ? langExactMatchExpression(lang1, labelLangBinding) : langMatchExpression(lang1, labelLangBinding),
      lang2 === "" ? langExactMatchExpression(lang2, labelLangBinding) : langMatchExpression(lang2, labelLangBinding),
    ],
  };

  // remove the first lang until there's no lang left
  let extraLang = languages.shift();
  while (typeof extraLang !== "undefined") {
    // nest 'OR' operations
    expression = {
      type: "operation",
      operator: "||",
      args: [
        expression,
        extraLang === ""
          ? langExactMatchExpression("", labelLangBinding)
          : langMatchExpression(extraLang, labelLangBinding),
      ],
    };
    extraLang = languages.shift();
  }
  return {
    type: "filter",
    expression,
  };
}

export function generateLangOptional(bindings: ILangBindings, langs: string[]): BlockPattern {
  const {binding, labelBinding, labelLangBinding} = bindings;
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
      langFilter(labelLangBinding, langs),
    ],
  };

  return findLabel;
}

export function generateLangCoalesce(bindings: ILangBindings, langs: string[]): BindPattern {
  const {binding, labelBinding, labelLangBinding} = bindings;
  const coalesceLabel: BindPattern = {
    type: "bind",
    variable: labelBinding,
    expression: {
      type: "operation",
      operator: "coalesce",
      args: [
        labelLangBinding,
        literal(""),
      ],
    },
  };

  return coalesceLabel;
}
