import { literal, namedNode } from "@rdfjs/data-model";
import { inspect } from "util";
import DataSet from "./dataset";
import Attribute from "./expressions/attribute";
import Dimension from "./expressions/dimension";
import Measure from "./expressions/measure";

function l(obj: any) {
  return inspect(obj, false, 10000, true);
}

function extractFilter(sparql: string) {
  return sparql.split("\n").find((line) => line.trim().startsWith("FILTER")).trim();
}

const betriebsartDimension = new Dimension({
  label: "Betriebsart",
  iri: "https://ld.stadt-zuerich.ch/statistics/property/BTA",
});
const geschlechtDimension = new Dimension({
  label: "Geschlecht",
  iri: "https://ld.stadt-zuerich.ch/statistics/property/SEX",
});
const raumDimension = new Dimension({
  label: "Raum",
  iri: "https://ld.stadt-zuerich.ch/statistics/property/RAUM",
});
const zeitDimension = new Dimension({
  label: "Zeit",
  iri: "https://ld.stadt-zuerich.ch/statistics/property/ZEIT",
});
const beschaeftigteMeasure = new Measure({
  label: "Beschäftigte",
  iri: "https://ld.stadt-zuerich.ch/statistics/measure/BES",
});
const quelleAttribute = new Attribute({
  label: "Quelle",
  iri: "https://ld.stadt-zuerich.ch/statistics/attribute/QUELLE",
});
const glossarAttribute = new Attribute({
  label: "Glossar",
  iri: "https://ld.stadt-zuerich.ch/statistics/attribute/GLOSSAR",
});
const fussnoteAttribute = new Attribute({
  label: "Fussnote",
  iri: "https://ld.stadt-zuerich.ch/statistics/attribute/FUSSNOTE",
});
const datenstandAttribute = new Attribute({
  label: "Datenstand",
  iri: "https://ld.stadt-zuerich.ch/statistics/attribute/DATENSTAND",
});
const erwarteteAktualisierungAttribute = new Attribute({
  label: "Erwartete Aktualisierung",
  iri: "https://ld.stadt-zuerich.ch/statistics/attribute/ERWARTETE_AKTUALISIERUNG",
});
const korrekturAttribute = new Attribute({
  label: "Korrektur",
  iri: "https://ld.stadt-zuerich.ch/statistics/attribute/KORREKTUR",
});

const dataset: DataSet = new DataSet(
  "https://ld.stadt-zuerich.ch/query",
  {
    dataSetIri: namedNode("https://ld.stadt-zuerich.ch/statistics/dataset/BES-RAUM-ZEIT-BTA-SEX"),
    dataSetLabel: literal("Beschäftigte nach Betriebsart, Raum, Geschlecht, Zeit"),
    graphIri: namedNode("https://linked.opendata.swiss/graph/zh/statistics"),
  },
);

test("basic", async () => {
  const query = dataset
    .query()
    .select({
      betriebsart: betriebsartDimension,
      geschlecht: geschlechtDimension,
      raum: raumDimension,
      zeit: zeitDimension,

      bep: beschaeftigteMeasure,

      quelle: quelleAttribute,
      glossar: glossarAttribute,
      fussnote: fussnoteAttribute,
      datenstand: datenstandAttribute,
      erwarteteAktualisierung: erwarteteAktualisierungAttribute,
      korrektur: korrekturAttribute,
    });
  const sparql = await query.toSparql();
  expect(sparql).toMatchSnapshot();
});

test("distinct", async () => {
  const query = dataset
    .query()
    .select({
      raum: raumDimension.distinct(),
    });
  const sparql = await query.toSparql();
  expect(sparql).toMatchSnapshot();
});

test("empty select", async () => {
  const query = dataset
    .query();
  const sparql = await query.toSparql();
  expect(sparql).toMatchSnapshot();
});

describe("avg", () => {
  test("avg", async () => {
    const query = dataset
      .query()
      .select({
        raum: raumDimension,
        bep: beschaeftigteMeasure.avg(),
      });
    const sparql = await query.toSparql();
    expect(sparql).toMatchSnapshot();
  });
  test("avg and filter", async () => {
    const query = dataset
      .query()
      .select({
        raum: raumDimension,
        bep: beschaeftigteMeasure.avg(),
      })
    .filter(raumDimension.not.in([namedNode("http://foo")]));
    const sparql = await query.toSparql({ limit: 50, offset: 150 });
    expect(sparql).toMatchSnapshot();
  });

  test("avg has auto groupBy", async () => {
    const sparqlA = await dataset
      .query()
      .select({
        raum: raumDimension,
        bep: beschaeftigteMeasure.avg(),
      })
      .groupBy("raum")
      .toSparql();
    const sparqlB = await dataset
      .query()
      .select({
        raum: raumDimension,
        bep: beschaeftigteMeasure.avg(),
      })
      .toSparql();
    expect(sparqlA).toBe(sparqlB);
  });

  test("avg distinct", async () => {
    const query = dataset
      .query()
      .select({
        betriebsart: betriebsartDimension,
        geschlecht: geschlechtDimension,
        raum: raumDimension,
        zeit: zeitDimension,

        bep: beschaeftigteMeasure.avg().distinct(),

        quelle: quelleAttribute,
        glossar: glossarAttribute,
        fussnote: fussnoteAttribute,
        datenstand: datenstandAttribute,
        erwarteteAktualisierung: erwarteteAktualisierungAttribute,
        korrektur: korrekturAttribute,
      });
    const sparql = await query.toSparql();
    expect(sparql).toMatchSnapshot();
  });
});

describe("groupBy", () => {
  test("with avg doesn't duplicate groupby vars", async () => {
    const query = dataset
      .query()
      .select({
        raum: raumDimension,
        zeit: zeitDimension,

        bep: beschaeftigteMeasure.avg().distinct(),
      })
      // .filter(space.equals("http://something/R3000"))
      .groupBy(({ zeit }) => zeit)
      .groupBy(({ raum }) => raum);
    const sparql = await query.toSparql();
    expect(sparql).toMatchSnapshot();
  });

  test("groups with a function", async () => {
    const query = dataset
      .query()
      .select({
        betriebsart: betriebsartDimension,
        geschlecht: geschlechtDimension,
        raum: raumDimension,
        zeit: zeitDimension,

        bep: beschaeftigteMeasure,

        quelle: quelleAttribute,
        glossar: glossarAttribute,
        fussnote: fussnoteAttribute,
      })
      // .filter(raumDimension.equals("https://ld.stadt-zuerich.ch/statistics/code/R30000"))
      // .filter(zeitDim.between("now-24h", "now"))
      // .filter(helDim.match(/^s.*/))
      .groupBy(({ zeit }) => zeit)
      .groupBy(({ raum }) => raum);
      // .having(({ bep }) => bep.gte(10000))
    const sparql = await query.toSparql();
    expect(sparql).toMatchSnapshot();
  });

  test("groups with strings", async () => {
    const base = dataset
      .query()
      .select({
        betriebsart: betriebsartDimension,
        geschlecht: geschlechtDimension,
        raum: raumDimension,
        zeit: zeitDimension,

        bep: beschaeftigteMeasure,

        quelle: quelleAttribute,
        glossar: glossarAttribute,
        fussnote: fussnoteAttribute,
      });
    const queryA = base
      .groupBy(({ zeit }) => zeit)
      .groupBy(({ raum }) => raum);
    const queryB = base
      .groupBy("zeit")
      .groupBy("raum");
    const sparqlA = await queryA.toSparql();
    const sparqlB = await queryB.toSparql();
    expect(sparqlA).toBe(sparqlB);
  });

  test("doesn't duplicate", async () => {
    const query = dataset
      .query()
      .select({
        betriebsart: betriebsartDimension,
        geschlecht: geschlechtDimension,
        raum: raumDimension,
        zeit: zeitDimension,

        bep: beschaeftigteMeasure,

        quelle: quelleAttribute,
        glossar: glossarAttribute,
        fussnote: fussnoteAttribute,
      })
      // .filter(raumDimension.equals("https://ld.stadt-zuerich.ch/statistics/code/R30000"))
      // .filter(zeitDim.between("now-24h", "now"))
      // .filter(helDim.match(/^s.*/))
      // .filter(betriebsartDimension.gte(200).in([namedNode("http://foo.bar")]).not)
      .groupBy("zeit")
      .groupBy(({ zeit }) => zeit)
      .groupBy(({ zeit }) => zeit)
      .groupBy("raum")
      .groupBy(({ raum }) => raum);
      // .having(({ bep }) => bep.gte(10000))
    const sparql = await query.toSparql();
    expect(sparql).toMatchSnapshot();
  });
});

test("group and filter", async () => {
  const base = dataset
    .query()
    .select({
      betriebsart: betriebsartDimension,
      geschlecht: geschlechtDimension,
      raum: raumDimension,
      zeit: zeitDimension,

      bep: beschaeftigteMeasure,

      quelle: quelleAttribute,
      glossar: glossarAttribute,
      fussnote: fussnoteAttribute,
    });
  const query = base
    .filter(raumDimension.gte(literal("12")))
    .filter(beschaeftigteMeasure.gte(literal("12")))
    .groupBy(({ zeit }) => zeit)
    .groupBy(({ raum }) => raum);
  const sparql = await query.toSparql();
  expect(sparql).toMatchSnapshot();
});
