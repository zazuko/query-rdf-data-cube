import { literal, namedNode, variable } from "@rdfjs/data-model";
import { Literal, Variable } from "rdf-js";
import { ArrayExpr, IExpr, isTerm, TermExpr } from "./expressions";
import { Binding, into, Operator } from "./expressions/operator";
import { BindPattern, BlockPattern, Expression, FilterPattern, OperationExpression, PropertyPath, Triple, Tuple } from "./sparqljs";

/**
 * @ignore
 */
export const prefixes = {
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  qb: "http://purl.org/linked-data/cube#",
  dc11: "http://purl.org/dc/elements/1.1/",
  dcterms: "http://purl.org/dc/terms/",
  skos: "http://www.w3.org/2004/02/skos/core#",
};

/**
 * @ignore
 */
export const labelPredicate: PropertyPath = {
  type: "path",
  pathType: "|",
  items: [
    namedNode("http://www.w3.org/2000/01/rdf-schema#label"),
    namedNode("http://www.w3.org/2004/02/skos/core#prefLabel"),
  ],
};

/**
 * Convert [[Operator]] arguments into SPARQL.js `Expression`s
 * @ignore
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

/**
 * @ignore
 */
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
 * @ignore
 */
export function combineFilters(operations: OperationExpression[]): FilterPattern {
  let combined: OperationExpression;
  if (operations.length > 1) {
    combined = operations
      .reduce((acc, op) => {
        if (acc.args.length < 2) {
          acc.args.push(op);
          return acc;
        }
        return {
          operator: "&&",
          type: "operation",
          args: [acc, op],
        };
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

/**
 * @ignore
 */
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

/**
 * @ignore
 */
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

/**
 * @ignore
 */
export function generateLangOptionals(
  binding: Variable, labelBinding: Variable, predicate: Triple["predicate"], langs?: string[]): BlockPattern[] {
  if (Array.isArray(langs)) {
    return langs.map((lang: string) => {
      const labelLangBinding = variable(`${labelBinding.value}_${lang}`);
      const optionalStringInLang: BlockPattern = {
        type: "optional",
        patterns: [
          {
            type: "bgp",
            triples: [
              {
                subject: binding,
                predicate,
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
      return optionalStringInLang;
    });
  } else {
    const optionalVar: BlockPattern = {
      type: "optional",
      patterns: [
        {
          type: "bgp",
          triples: [
            {
              subject: binding,
              predicate,
              object: labelBinding,
            },
          ],
        },
      ],
    };
    return [optionalVar];
  }
}

/**
 * @ignore
 */
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

export interface SerializedLiteral {
  value: string;
  termType: string;
  language: string;
  datatype: {
    value: string;
    termType: string;
  };
}
/**
 * Serialize a Literal to a POJO.
 *
 * @param {Literal} lit
 * @returns SerializedLiteral
 */
export function literalToJSON(lit: Literal): SerializedLiteral {
  return {
    value: lit.value,
    termType: lit.termType,
    language: lit.language,
    datatype: { value: lit.datatype.value, termType: lit.datatype.termType },
  };
}

/**
 * Deserialize a Literal from a POJO.
 *
 * @param {SerializedLiteral} lit
 * @returns Literal
 */
export function literalFromJSON(lit: SerializedLiteral): Literal {
  return literal(lit.value, lit.language || namedNode(lit.datatype.value));
}
