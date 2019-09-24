// tslint:disable: trailing-comma
import { literal, namedNode } from "@rdfjs/data-model";
import { Dimension } from "../src/components";
import { DataCube } from "../src/datacube";
import { fetch } from "./utils/fetch-mock";

function extractFilter(sparql: string) {
  return sparql
    .split("\n")
    .filter((line: string) => line.trim().startsWith("FILTER"))
    .slice(-1)[0]
    .trim();
}

const dataCube: DataCube = new DataCube("https://ld.stadt-zuerich.ch/query", {
  iri: namedNode(
    "https://ld.stadt-zuerich.ch/statistics/dataset/BES-RAUM-ZEIT-BTA-SEX"
  ),
  labels: [
    {
      value: "Beschäftigte nach Betriebsart, Raum, Geschlecht, Zeit",
      language: "de"
    }
  ],
  graphIri: namedNode("https://linked.opendata.swiss/graph/zh/statistics"),
  fetcher: {
    fetch,
  },
});

const componentA = new Dimension({
  labels: [{ value: "aaaa", language: "" }],
  iri: "http://aaaa.aa"
});
const componentB = new Dimension({
  labels: [{ value: "bbbb", language: "" }],
  iri: "http://bbbb.bb"
});
const componentC = new Dimension({
  labels: [{ value: "cccc", language: "" }],
  iri: "http://cccc.cc"
});
const componentD = new Dimension({
  labels: [{ value: "dddd", language: "" }],
  iri: "http://dddd.dd"
});

test("basic", async () => {
  let sparql = await dataCube
    .query()
    .select({ a: componentA, b: componentB })
    .filter(({ a }) => a.not.bound())
    .toSparql();
  expect(extractFilter(sparql)).toMatchInlineSnapshot(`"FILTER(!(BOUND(?a)))"`);

  sparql = await dataCube
    .query()
    .select({ a: componentA, b: componentB })
    .filter(({ a }) => a.gte(componentB))
    .toSparql();
  expect(extractFilter(sparql)).toMatchInlineSnapshot(`"FILTER(?a >= ?b)"`);

  sparql = await dataCube
    .query()
    .select({ a: componentA, b: componentB })
    .filter(({ a }) => a.not.gte(10))
    .toSparql();
  expect(extractFilter(sparql)).toMatchInlineSnapshot(`"FILTER(!(?a >= 10 ))"`);
});

describe("fixtures", () => {
  it("NOT IN, !IN", async () => {
    const sparqlA = await dataCube
      .query()
      .select({ a: componentA, b: componentB })
      .filter(({ a }) => a.not.in([namedNode("http://example.com"), literal("foo", "en")]))
      .toSparql();
    expect(extractFilter(sparqlA)).toMatchInlineSnapshot(
      `"FILTER(?a NOT IN(<http://example.com>, \\"foo\\"@en))"`
    );
    const sparqlB = await dataCube
      .query()
      .select({ a: componentA, b: componentB })
      .filter(({ a }) => a.notIn([namedNode("http://example.com"), literal("foo", "en")]))
      .toSparql();
    expect(extractFilter(sparqlB)).toBe(extractFilter(sparqlA));
  });

  it("!=", async () => {
    const sparqlA = await dataCube
      .query()
      .select({ a: componentA, b: componentB })
      .filter(({ a }) => a.not.equals(10))
      .toSparql();
    expect(extractFilter(sparqlA)).toMatchInlineSnapshot(`"FILTER(?a != 10 )"`);
    const sparqlB = await dataCube
      .query()
      .select({ a: componentA, b: componentB })
      .filter(({ a }) => a.notEquals(10))
      .toSparql();
    expect(extractFilter(sparqlB)).toBe(extractFilter(sparqlA));
  });

  it("equals binding", async () => {
    const sparqlA = await dataCube
      .query()
      .select({ a: componentA, b: componentB })
      .filter(({ a }) => a.not.equals(componentB))
      .toSparql();
    expect(extractFilter(sparqlA)).toMatchInlineSnapshot(`"FILTER(?a != ?b)"`);
  });

  it('FILTER regex(?title, "^SPARQL") .', async () => {
    const query = dataCube
      .query()
      .select({ title: componentA })
      .filter(({ title }) => title.regex("^SPARQL"));

    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(REGEX(?title, \\"^SPARQL\\"^^xsd:string))"`
    );
  });

  it('FILTER regex(?title, "web", "i") .', async () => {
    const query = dataCube
      .query()
      .select({ title: componentA })
      .filter(({ title }) => title.regex("web", "i"));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(REGEX(?title, \\"web\\"^^xsd:string, \\"i\\"^^xsd:string))"`
    );
  });

  it("FILTER (?price < 30.5) .", async () => {
    const query = dataCube
      .query()
      .select({ price: componentA })
      .filter(({ price }) => price.lt(30.5));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(?price < \\"30.5\\"^^xsd:decimal)"`
    );
  });

  it("FILTER (?price <= 30.5) .", async () => {
    const query = dataCube
      .query()
      .select({ price: componentA })
      .filter(({ price }) => price.lte(30.5));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(?price <= \\"30.5\\"^^xsd:decimal)"`
    );
  });

  it('FILTER (?date > "2005-01-01T00:00:00Z"^^xsd:dateTime) .', async () => {
    const query = dataCube
      .query()
      .select({ date: componentA })
      .filter(({ date }) => date.gt("2005-01-01T00:00:00Z"));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(?date > \\"2005-01-01T00:00:00.000Z\\"^^xsd:dateTime)"`
    );
  });

  it("FILTER (bound(?date)) .", async () => {
    const query = dataCube
      .query()
      .select({ date: componentA })
      .filter(({ date }) => date.bound());
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(BOUND(?date))"`
    );
  });

  it("FILTER (!bound(?date)) .", async () => {
    const query = dataCube
      .query()
      .select({ date: componentA })
      .filter(({ date }) => date.not.bound());
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(!(BOUND(?date)))"`
    );
  });

  it("FILTER isIRI(?mbox) .", async () => {
    const query = dataCube
      .query()
      .select({ mbox: componentA })
      .filter(({ mbox }) => mbox.isIRI());
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(ISIRI(?mbox))"`
    );
  });

  it("FILTER isBlank(?c)", async () => {
    const query = dataCube
      .query()
      .select({ c: componentA })
      .filter(({ c }) => c.isBlank());
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(ISBLANK(?c))"`
    );
  });

  it("FILTER isLiteral(?mbox) .", async () => {
    const query = dataCube
      .query()
      .select({ mbox: componentA })
      .filter(({ mbox }) => mbox.isLiteral());
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(ISLITERAL(?mbox))"`
    );
  });

  it('FILTER regex(str(?mbox), "@work.example") .', async () => {
    const query = dataCube
      .query()
      .select({ mbox: componentA })
      .filter(({ mbox }) => mbox.str().regex("@work.example"));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(REGEX(STR(?mbox), \\"@work.example\\"^^xsd:string))"`
    );
  });

  it('FILTER (lang(?name) = "ES") .', async () => {
    const query = dataCube
      .query()
      .select({ name: componentA })
      .filter(({ name }) => name.lang().equals("ES"));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER((LANG(?name)) = \\"ES\\"^^xsd:string)"`
    );
  });

  it("FILTER (datatype(?shoeSize) = xsd:integer) .", async () => {
    const query = dataCube
      .query()
      .select({ shoeSize: componentA })
      .filter(({ shoeSize }) => shoeSize.datatype().equals("http://www.w3.org/2001/XMLSchema#integer"));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER((DATATYPE(?shoeSize)) = xsd:integer)"`
    );
  });

  it("FILTER (?mbox1 = ?mbox2 && ?name1 != ?name2) .", async () => {
    const query = dataCube
      .query()
      .select({ mbox1: componentA, mbox2: componentB, name1: componentC, name2: componentD })
      .filter(({ mbox1 }) => mbox1.equals(componentB))
      .filter(({ name1 }) => name1.not.equals(componentD));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER((?mbox1 = ?mbox2) && (?name1 != ?name2))"`
    );
  });

  it("FILTER (sameTerm(?mbox1, ?mbox2) && !sameTerm(?name1, ?name2)) .", async () => {
    const query = dataCube
      .query()
      .select({ mbox1: componentA, mbox2: componentB, name1: componentC, name2: componentD })
      .filter(({ mbox1 }) => mbox1.sameTerm(componentB))
      .filter(({ name1 }) => name1.not.sameTerm(componentD));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER((SAMETERM(?mbox1, ?mbox2)) && (!(SAMETERM(?name1, ?name2))))"`
    );
  });

  it("FILTER(?raum IN(<https://ld.stadt-zuerich.ch/statistics/code/R30000>)) .", async () => {
    const query = dataCube
      .query()
      .select({ raum: componentA })
      .filter(({ raum }) => raum.in(["https://ld.stadt-zuerich.ch/statistics/code/R30000"]));
    const sparql: string = await query.toSparql();
    expect(extractFilter(sparql)).toMatchInlineSnapshot(
      `"FILTER(?raum IN(<https://ld.stadt-zuerich.ch/statistics/code/R30000>))"`
    );
  });
});

describe("helpful errors", () => {
  it("isIRI", async () => {
    const filter = () => componentA.isIRI("http://foo");
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".isIRI doesn't accept arguments"`
    );
  });

  it("isBlank", async () => {
    const filter = () => componentA.isBlank("http://foo");
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".isBlank doesn't accept arguments"`
    );
  });

  it("isLiteral", async () => {
    const filter = () => componentA.isLiteral("http://foo");
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".isLiteral doesn't accept arguments"`
    );
  });

  it("lang", async () => {
    const filter = () => componentA.lang("http://foo");
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".lang doesn't accept arguments"`
    );
  });

  it("datatype", async () => {
    const filter = () => componentA.datatype("http://foo");
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".datatype doesn't accept arguments"`
    );
  });

  it("str", async () => {
    const filter = () => componentA.str("http://foo");
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".str doesn't accept arguments"`
    );
  });

  it("sameTerm", async () => {
    const filter = () => componentA.sameTerm(componentB, componentC);
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".sameTerm expects one argument"`
    );
  });

  it("equals", async () => {
    const filter = () => componentA.equals(componentB, componentC);
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".equals expects one argument"`
    );
  });

  it("notEquals", async () => {
    const filter = () => componentA.notEquals(componentB, componentC);
    expect(filter).toThrowErrorMatchingInlineSnapshot(
      `".notEquals expects one argument"`
    );
  });
});
