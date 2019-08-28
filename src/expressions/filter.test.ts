import { literal, namedNode } from "@rdfjs/data-model";
import DataSet from "../dataset";
import Dimension from "./dimension";
import Operator from "./operator";

const dataset: DataSet = new DataSet(
  "https://ld.stadt-zuerich.ch/query",
  {
    dataSetIri: namedNode("https://ld.stadt-zuerich.ch/statistics/dataset/BES-RAUM-ZEIT-BTA-SEX"),
    dataSetLabel: literal("Beschäftigte nach Betriebsart, Raum, Geschlecht, Zeit"),
    graphIri: namedNode("https://linked.opendata.swiss/graph/zh/statistics"),
  },
);

test("basic", async () => {
  const a: any = new Dimension({ label: "aaaa", iri: "http://aaaa.aaa" });
  const b: any = new Dimension({ label: "bbbb", iri: "http://bbbb.bbb" });

  expect(await dataset.query().select({ a, b }).filter(a.not.bound()).applyFilters()).toMatchSnapshot();

  expect(
    await dataset.query()
    .select({ a, b })
    .filter(a.gte(b))
    .applyFilters(),
  ).toMatchSnapshot();

  expect(
    await dataset.query()
    .select({ a, b })
    .filter(a.not.gte(literal("10")))
    .applyFilters(),
  ).toMatchSnapshot();

  expect(
    await dataset.query()
    .select({ a, b })
    .filter(a.not.in([namedNode("http://example.com"), literal("foo", "en")]))
    .applyFilters(),
  ).toMatchSnapshot();
});
