import { literal } from "@rdfjs/data-model";
import namespace from "@rdfjs/namespace";
import { toLiteral } from "../expressions/utils";

const xsd = namespace("http://www.w3.org/2001/XMLSchema#");
const rdf = namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");

describe("toLiteral", () => {
  it("recognizes integers", () => {
    expect(toLiteral(10)).toEqual(literal("10", xsd("integer")));
    expect(toLiteral(-10)).toEqual(literal("-10", xsd("integer")));
  });

  it("recognizes decimals", () => {
    expect(toLiteral(10.2)).toEqual(literal("10.2", xsd("decimal")));
    expect(toLiteral(-10.2)).toEqual(literal("-10.2", xsd("decimal")));
  });

  it("recognizes doubles", () => {
    expect(toLiteral("7.65432e3")).toEqual(literal("7.65432e3", xsd("double")));
    expect(toLiteral("-7.65432e3")).toEqual(literal("-7.65432e3", xsd("double")));
  });

  it("recognizes dates", () => {
    const now = new Date();
    expect(toLiteral(now)).toEqual(literal(now.toISOString(), xsd("dateTime")));
  });

  it("recognizes date strings", () => {
    const now = new Date();
    expect(toLiteral(now.toISOString())).toEqual(literal(now.toISOString(), xsd("dateTime")));
  });

  it("recognizes booleans", () => {
    expect(toLiteral(true)).toEqual(literal("true", xsd("boolean")));
    expect(toLiteral(false)).toEqual(literal("false", xsd("boolean")));
    expect(toLiteral("true")).toEqual(literal("true", xsd("boolean")));
    expect(toLiteral("false")).toEqual(literal("false", xsd("boolean")));
  });

  it("recognizes literals", () => {
    const literals = [
      literal("true"),
      literal("hey", "en"),
      literal("10", xsd("integer")),
    ];
    literals.forEach((l) => {
      expect(toLiteral(l)).toEqual(l);
    });
  });
});
