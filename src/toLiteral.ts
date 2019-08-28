import { literal } from "@rdfjs/data-model";
import namespace from "@rdfjs/namespace";
import { Literal } from "rdf-js";

const xsd = namespace("http://www.w3.org/2001/XMLSchema#");
const dateTime = /^\d{4}(-[01]\d(-[0-3]\d(T[0-2]\d:[0-5]\d:?([0-5]\d(\.\d+)?)?([+-][0-2]\d:[0-5]\d)?Z?)?)?)$/;
const bool = /^(true|false)$/;
const numb = /^[\-+]?(?:\d+\.?\d*([eE](?:[\-\+])?\d+)|\d*\.?\d+)$/;

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

function isLiteral(term: any): term is Literal {
  return (term instanceof literal("").constructor);
}
