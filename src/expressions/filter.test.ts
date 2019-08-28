// tslint:disable: trailing-comma
import { literal, namedNode } from "@rdfjs/data-model";
import { inspect } from "util";
import DataSet from "../dataset";
import Dimension from "./dimension";

function l(obj: any) {
  return inspect(obj, false, 10000, true);
}

function extractFilter(sparql: string) {
  return sparql
    .split("\n")
    .find((line: string) => line.trim().startsWith("FILTER"))
    .trim();
}

const dataset: DataSet = new DataSet("https://ld.stadt-zuerich.ch/query", {
  dataSetIri: namedNode(
    "https://ld.stadt-zuerich.ch/statistics/dataset/BES-RAUM-ZEIT-BTA-SEX"
  ),
  dataSetLabel: literal(
    "Beschäftigte nach Betriebsart, Raum, Geschlecht, Zeit"
  ),
  graphIri: namedNode("https://linked.opendata.swiss/graph/zh/statistics")
});
const a: any = new Dimension({ label: "aaaa", iri: "http://aaaa.aaa" });
const b: any = new Dimension({ label: "bbbb", iri: "http://bbbb.bbb" });

test("basic", async () => {
  let sparql = await dataset
    .query()
    .select({ a, b })
    .filter(a.not.bound())
    .toSparql();
  expect(extractFilter(sparql)).toMatchInlineSnapshot(`"FILTER(!(BOUND(?a)))"`);

  sparql = await dataset
    .query()
    .select({ a, b })
    .filter(a.gte(b))
    .toSparql();
  expect(extractFilter(sparql)).toMatchInlineSnapshot(`"FILTER(?a >= ?b)"`);

  sparql = await dataset
    .query()
    .select({ a, b })
    .filter(a.not.gte(10))
    .toSparql();
  expect(extractFilter(sparql)).toMatchInlineSnapshot(`"FILTER(!(?a >= 10 ))"`);

  sparql = await dataset
    .query()
    .select({ a, b })
    .filter(a.not.in([namedNode("http://example.com"), literal("foo", "en")]))
    .toSparql();
  expect(extractFilter(sparql)).toMatchInlineSnapshot(
    `"FILTER(!(?a IN(<http://example.com>, \\"foo\\"@en)))"`
  );
});

describe("fixtures", () => {
  it('FILTER regex(?title, "^SPARQL") .', async () => {
    const query = dataset
      .query()
      .select({ title: a })
      .filter(a.regex("^SPARQL"));

    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(REGEX(?title, \\"^SPARQL\\"^^<http://www.w3.org/2001/XMLSchema#string>))"`
    );
  });

  it('FILTER regex(?title, "web", "i") .', async () => {
    const query = dataset
      .query()
      .select({ title: a })
      .filter(a.regex("web", "i"));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(REGEX(?title, \\"web\\"^^<http://www.w3.org/2001/XMLSchema#string>, \\"i\\"^^<http://www.w3.org/2001/XMLSchema#string>))"`
    );
  });

  it("FILTER (?price <= 30.5) .", async () => {
    const query = dataset
      .query()
      .select({ price: a })
      .filter(a.lte(30.5));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(?price <= \\"30.5\\"^^<http://www.w3.org/2001/XMLSchema#decimal>)"`
    );
  });

  it('FILTER (?date > "2005-01-01T00:00:00Z"^^xsd:dateTime) .', async () => {
    const query = dataset
      .query()
      .select({ date: a })
      .filter(a.gt("2005-01-01T00:00:00Z"));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(?date > \\"2005-01-01T00:00:00.000Z\\"^^<http://www.w3.org/2001/XMLSchema#dateTime>)"`
    );
  });

  it("FILTER (bound(?date)) .", async () => {
    const query = dataset
      .query()
      .select({ date: a })
      .filter(a.bound());
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(BOUND(?date))"`
    );
  });

  it("FILTER (!bound(?date)) .", async () => {
    const query = dataset
      .query()
      .select({ date: a })
      .filter(a.not.bound());
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(!(BOUND(?date)))"`
    );
  });

  it("FILTER isIRI(?mbox) .", async () => {
    const query = dataset
      .query()
      .select({ mbox: a })
      .filter(a.isIRI());
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(ISIRI(?mbox))"`
    );
  });

  it("FILTER isBlank(?c)", async () => {
    const query = dataset
      .query()
      .select({ c: a })
      .filter(a.isBlank());
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(ISBLANK(?c))"`
    );
  });

  it("FILTER isLiteral(?mbox) .", async () => {
    const query = dataset
      .query()
      .select({ mbox: a })
      .filter(a.isLiteral());
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(ISLITERAL(?mbox))"`
    );
  });

  // it('FILTER regex(str(?mbox), "@work.example") .', async () => {
  //   const query = dataset
  //     .query()
  //     .select({ a: a })
  //     .filter();
  //   const sparql: string = await query.toSparql();
  //   expect(extractFilter(sparql))
  //     .toMatchInlineSnapshot('FILTER regex(str(?mbox), "@work.example") .' );
  // });

  // it('FILTER (lang(?name) = "ES") .', async () => {
  //   const query = dataset
  //     .query()
  //     .select({ a: a })
  //     .filter();
  //   const sparql: string = await query.toSparql();
  //   expect(extractFilter(sparql))
  //     .toMatchInlineSnapshot('FILTER (lang(?name) = "ES") .' );
  // });

  // it("FILTER (datatype(?shoeSize) = xsd:integer) ." , async () => {
  //   const query = dataset
  //     .query()
  //     .select({ a: a })
  //     .filter();
  //   const sparql: string = await query.toSparql();
  //   expect(extractFilter(sparql))
  //     .toBe("FILTER (datatype(?shoeSize) = xsd:integer) ." );
  // });

  // it("FILTER (?mbox1 = ?mbox2 && ?name1 != ?name2) ." , async () => {
  //   const query = dataset
  //     .query()
  //     .select({ a: a })
  //     .filter();
  //   const sparql: string = await query.toSparql();
  //   expect(extractFilter(sparql))
  //     .toBe("FILTER (?mbox1 = ?mbox2 && ?name1 != ?name2) ." );
  // });

  // it('FILTER (?date = xsd:dateTime("2005-01-01T00:00:00Z")) .', async () => {
  //   const query = dataset
  //     .query()
  //     .select({ a: a })
  //     .filter();
  //   const sparql: string = await query.toSparql();
  //   expect(extractFilter(sparql))
  //     .toMatchInlineSnapshot('FILTER (?date = xsd:dateTime("2005-01-01T00:00:00Z")) .' );
  // });

  // it("FILTER (sameTerm(?mbox1, ?mbox2) && !sameTerm(?name1, ?name2)) ." , async () => {
  //   const query = dataset
  //     .query()
  //     .select({ a: a })
  //     .filter();
  //   const sparql: string = await query.toSparql();
  //   expect(extractFilter(sparql))
  //     .toBe("FILTER (sameTerm(?mbox1, ?mbox2) && !sameTerm(?name1, ?name2)) ." );
  // });

  // it("FILTER (sameTerm(?aWeight, ?bWeight) && !sameTerm(?aDisp, ?bDisp)) ." , async () => {
  //   const query = dataset
  //     .query()
  //     .select({ a: a })
  //     .filter();
  //   const sparql: string = await query.toSparql();
  //   expect(extractFilter(sparql))
  //     .toBe("FILTER (sameTerm(?aWeight, ?bWeight) && !sameTerm(?aDisp, ?bDisp)) ." );
  // });

  // it('FILTER langMatches(lang(?title), "FR") .', async () => {
  //   const query = dataset
  //     .query()
  //     .select({ a: a })
  //     .filter();
  //   const sparql: string = await query.toSparql();
  //   expect(extractFilter(sparql))
  //     .toMatchInlineSnapshot('FILTER langMatches(lang(?title), "FR") .' );
  // });

  // it('FILTER langMatches(lang(?title), "*") .', async () => {
  //   const query = dataset
  //     .query()
  //     .select({ a: a })
  //     .filter();
  //   const sparql: string = await query.toSparql();
  //   expect(extractFilter(sparql))
  //     .toMatchInlineSnapshot('FILTER langMatches(lang(?title), "*") .' );
  // });

  // it('FILTER regex(?name, "^ali", "i") .', async () => {
  //   const query = dataset
  //     .query()
  //     .select({ a: a })
  //     .filter();
  //   const sparql: string = await query.toSparql();
  //   expect(extractFilter(sparql))
  //     .toMatchInlineSnapshot('FILTER regex(?name, "^ali", "i") .' );
  // });

  // it('FILTER("2015-01-01"^^xsd:dateTime <= ?dob && ?dob < "2016-01-01"^^xsd:dateTime) .', async () => {
  //   const query = dataset
  //     .query()
  //     .select({ a: a })
  //     .filter();
  //   const sparql: string = await query.toSparql();
  //   expect(extractFilter(sparql))
  //     .toMatchInlineSnapshot('FILTER("2015-01-01"^^xsd:dateTime <= ?dob && ?dob < "2016-01-01"^^xsd:dateTime) .');
  // });

  // it("FILTER(?raum IN(<https://ld.stadt-zuerich.ch/statistics/code/R30000>)) .", async () => {
  //   const query = dataset
  //     .query()
  //     .select({ a: a })
  //     .filter();
  //   const sparql: string = await query.toSparql();
  //   expect(extractFilter(sparql))
  //     .toBe("FILTER(?raum IN(<https://ld.stadt-zuerich.ch/statistics/code/R30000>)) .");
  // });

  // it("FILTER(?raum NOT IN(<https://ld.stadt-zuerich.ch/statistics/code/R30000>)) .", async () => {
  //   const query = dataset
  //     .query()
  //     .select({ a: a })
  //     .filter();
  //   const sparql: string = await query.toSparql();
  //   expect(extractFilter(sparql))
  //     .toBe("FILTER(?raum NOT IN(<https://ld.stadt-zuerich.ch/statistics/code/R30000>)) .");
  // });
});
