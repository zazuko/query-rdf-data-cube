// tslint:disable: trailing-comma
import { literal, namedNode } from "@rdfjs/data-model";
import Dimension from "../components/dimension";
import DataSet from "../dataset";

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

const a: any = new Dimension({ label: "aaaa", iri: "http://aaaa.aa" });
const b: any = new Dimension({ label: "bbbb", iri: "http://bbbb.bb" });
const c: any = new Dimension({ label: "cccc", iri: "http://cccc.cc" });
const d: any = new Dimension({ label: "dddd", iri: "http://dddd.dd" });

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
});

describe("fixtures", () => {
  it("NOT IN, !IN", async () => {
    const sparqlA = await dataset
      .query()
      .select({ a, b })
      .filter(a.not.in([namedNode("http://example.com"), literal("foo", "en")]))
      .toSparql();
    expect(extractFilter(sparqlA)).toMatchInlineSnapshot(
      `"FILTER(?a NOT IN(<http://example.com>, \\"foo\\"@en))"`
    );
    const sparqlB = await dataset
      .query()
      .select({ a, b })
      .filter(a.notIn([namedNode("http://example.com"), literal("foo", "en")]))
      .toSparql();
    expect(extractFilter(sparqlB)).toBe(extractFilter(sparqlA));
  });

  it("!=", async () => {
    const sparqlA = await dataset
      .query()
      .select({ a, b })
      .filter(a.not.equals(10))
      .toSparql();
    expect(extractFilter(sparqlA)).toMatchInlineSnapshot(`"FILTER(?a != 10 )"`);
    const sparqlB = await dataset
      .query()
      .select({ a, b })
      .filter(a.notEquals(10))
      .toSparql();
    expect(extractFilter(sparqlB)).toBe(extractFilter(sparqlA));
  });

  it("equals binding", async () => {
    const sparqlA = await dataset
      .query()
      .select({ a, b })
      .filter(a.not.equals(b))
      .toSparql();
    expect(extractFilter(sparqlA)).toMatchInlineSnapshot(`"FILTER(?a != ?b)"`);
  });

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

  it("FILTER (?price < 30.5) .", async () => {
    const query = dataset
      .query()
      .select({ price: a })
      .filter(a.lt(30.5));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(?price < \\"30.5\\"^^<http://www.w3.org/2001/XMLSchema#decimal>)"`
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

  it('FILTER regex(str(?mbox), "@work.example") .', async () => {
    const query = dataset
      .query()
      .select({ mbox: a })
      .filter(a.str().regex("@work.example"));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(REGEX(STR(?mbox), \\"@work.example\\"^^<http://www.w3.org/2001/XMLSchema#string>))"`
    );
  });

  it('FILTER (lang(?name) = "ES") .', async () => {
    const query = dataset
      .query()
      .select({ name: a })
      .filter(a.lang().equals("ES"));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER((LANG(?name)) = \\"ES\\"^^<http://www.w3.org/2001/XMLSchema#string>)"`
    );
  });

  it("FILTER (datatype(?shoeSize) = xsd:integer) .", async () => {
    const query = dataset
      .query()
      .select({ shoeSize: a })
      .filter(a.datatype().equals("http://www.w3.org/2001/XMLSchema#integer"));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER((DATATYPE(?shoeSize)) = <http://www.w3.org/2001/XMLSchema#integer>)"`
    );
  });

  it("FILTER (?mbox1 = ?mbox2 && ?name1 != ?name2) .", async () => {
    const query = dataset
      .query()
      .select({ mbox1: a, mbox2: b, name1: c, name2: d })
      .filter(a.equals(b))
      .filter(c.not.equals(d));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER((?mbox1 = ?mbox2) && (?name1 != ?name2))"`
    );
  });

  it("FILTER (sameTerm(?mbox1, ?mbox2) && !sameTerm(?name1, ?name2)) .", async () => {
    const query = dataset
      .query()
      .select({ mbox1: a, mbox2: b, name1: c, name2: d })
      .filter(a.sameTerm(b))
      .filter(c.not.sameTerm(d));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER((SAMETERM(?mbox1, ?mbox2)) && (!(SAMETERM(?name1, ?name2))))"`
    );
  });

  it("FILTER(?raum IN(<https://ld.stadt-zuerich.ch/statistics/code/R30000>)) .", async () => {
    const query = dataset
      .query()
      .select({ raum: a })
      .filter(a.in(["https://ld.stadt-zuerich.ch/statistics/code/R30000"]));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(?raum IN(<https://ld.stadt-zuerich.ch/statistics/code/R30000>))"`
    );
  });
});

describe("helpful errors", () => {
  it("isIRI", async () => {
    const filter = () => a.isIRI("http://foo");
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".isIRI doesn't accept arguments"`
    );
  });

  it("isBlank", async () => {
    const filter = () => a.isBlank("http://foo");
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".isBlank doesn't accept arguments"`
    );
  });

  it("isLiteral", async () => {
    const filter = () => a.isLiteral("http://foo");
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".isLiteral doesn't accept arguments"`
    );
  });

  it("lang", async () => {
    const filter = () => a.lang("http://foo");
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".lang doesn't accept arguments"`
    );
  });

  it("datatype", async () => {
    const filter = () => a.datatype("http://foo");
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".datatype doesn't accept arguments"`
    );
  });

  it("str", async () => {
    const filter = () => a.str("http://foo");
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".str doesn't accept arguments"`
    );
  });

  it("sameTerm", async () => {
    const filter = () => a.sameTerm(b, c);
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".sameTerm expects one argument"`
    );
  });

  it("equals", async () => {
    const filter = () => a.equals(b, c);
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".equals expects one argument"`
    );
  });

  it("notEquals", async () => {
    const filter = () => a.notEquals(b, c);
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".notEquals expects one argument"`
    );
  });
});
