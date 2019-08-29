import rdf from "@rdfjs/data-model";
import namespace from "@rdfjs/namespace";
import { toLiteral } from "./toLiteral";

const xsd = namespace("http://www.w3.org/2001/XMLSchema#");

describe("toLiteral", () => {
  it("recognizes integers", () => {
    expect(toLiteral(10)).toEqual(rdf.literal("10", xsd("integer")));
    expect(toLiteral(-10)).toEqual(rdf.literal("-10", xsd("integer")));
  });

  it("recognizes decimals", () => {
    expect(toLiteral(10.2)).toEqual(rdf.literal("10.2", xsd("decimal")));
    expect(toLiteral(-10.2)).toEqual(rdf.literal("-10.2", xsd("decimal")));
  });

  it("recognizes doubles", () => {
    expect(toLiteral("7.65432e3")).toEqual(rdf.literal("7.65432e3", xsd("double")));
    expect(toLiteral("-7.65432e3")).toEqual(rdf.literal("-7.65432e3", xsd("double")));
  });

  it("recognizes dates", () => {
    const now = new Date();
    expect(toLiteral(now)).toEqual(rdf.literal(now.toISOString(), xsd("dateTime")));
  });

  it("recognizes date strings", () => {
    const now = new Date();
    expect(toLiteral(now.toISOString())).toEqual(rdf.literal(now.toISOString(), xsd("dateTime")));
  });

  it("recognizes booleans", () => {
    expect(toLiteral(true)).toEqual(rdf.literal("true", xsd("boolean")));
    expect(toLiteral(false)).toEqual(rdf.literal("false", xsd("boolean")));
    expect(toLiteral("true")).toEqual(rdf.literal("true", xsd("boolean")));
    expect(toLiteral("false")).toEqual(rdf.literal("false", xsd("boolean")));
  });
});
