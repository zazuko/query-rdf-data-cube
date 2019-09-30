import { literal, namedNode } from "@rdfjs/data-model";
import { Attribute, Dimension, Measure } from "../src/components";
import { DataCube} from "../src/datacube";
import { DataCubeEntryPoint } from "../src/entrypoint";
import { extractFilter } from "./filter.test";
import { fetch } from "./utils/fetch-mock";

const betriebsartDimension = new Dimension({
  labels: [{ value: "Betriebsart", language: "" }],
  iri: "https://ld.stadt-zuerich.ch/statistics/property/BTA",
});
const geschlechtDimension = new Dimension({
  labels: [{ value: "Geschlecht", language: "" }],
  iri: "https://ld.stadt-zuerich.ch/statistics/property/SEX",
});
const raumDimension = new Dimension({
  labels: [{ value: "Raum", language: "" }],
  iri: "https://ld.stadt-zuerich.ch/statistics/property/RAUM",
});
const zeitDimension = new Dimension({
  labels: [{ value: "Zeit", language: "" }],
  iri: "https://ld.stadt-zuerich.ch/statistics/property/ZEIT",
});
const beschaeftigteMeasure = new Measure({
  labels: [{ value: "Beschäftigte", language: "" }],
  iri: "https://ld.stadt-zuerich.ch/statistics/measure/BES",
});
const quelleAttribute = new Attribute({
  labels: [{ value: "Quelle", language: "" }],
  iri: "https://ld.stadt-zuerich.ch/statistics/attribute/QUELLE",
});
const glossarAttribute = new Attribute({
  labels: [{ value: "Glossar", language: "" }],
  iri: "https://ld.stadt-zuerich.ch/statistics/attribute/GLOSSAR",
});
const fussnoteAttribute = new Attribute({
  labels: [{ value: "Fussnote", language: "" }],
  iri: "https://ld.stadt-zuerich.ch/statistics/attribute/FUSSNOTE",
});
const datenstandAttribute = new Attribute({
  labels: [{ value: "Datenstand", language: "" }],
  iri: "https://ld.stadt-zuerich.ch/statistics/attribute/DATENSTAND",
});
const erwarteteAktualisierungAttribute = new Attribute({
  labels: [{ value: "Erwartete Aktualisierung", language: "" }],
  iri:
    "https://ld.stadt-zuerich.ch/statistics/attribute/ERWARTETE_AKTUALISIERUNG",
});
const korrekturAttribute = new Attribute({
  labels: [{ value: "Korrektur", language: "" }],
  iri: "https://ld.stadt-zuerich.ch/statistics/attribute/KORREKTUR",
});

const dataCube: DataCube = new DataCube("https://ld.stadt-zuerich.ch/query", {
  iri: namedNode(
    "https://ld.stadt-zuerich.ch/statistics/dataset/BES-RAUM-ZEIT-BTA-SEX",
  ),
  labels: [
    {
      value: "Beschäftigte nach Betriebsart, Raum, Geschlecht, Zeit",
      language: "de",
    },
  ],
  graphIri: namedNode("https://linked.opendata.swiss/graph/zh/statistics"),
  fetcher: {
    fetch,
  },
});

test("basic", async () => {
  const query = dataCube.query().select({
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

describe("select", () => {
  test("throws helpful message on falsy components", async () => {
    const query = dataCube.query();
    expect(() =>
      query.select({
        betriebsart: betriebsartDimension,
        geschlecht: geschlechtDimension,
        raum: null,
        zeit: zeitDimension,
      }),
    ).toThrowErrorMatchingInlineSnapshot(`
"Invalid Component in
\`.select({ raum: someFalsyValue })\`
                 ^^^^^^^^^^^^^^"
`);
  });
});

test("distinct", async () => {
  const query = dataCube.query()
    .select({
      raum: raumDimension,
    })
    .distinct();
  const sparql = await query.toSparql();
  expect(sparql).toMatchSnapshot();
});

test("empty select", async () => {
  const query = dataCube.query();
  const sparql = await query.toSparql();
  expect(sparql).toMatchSnapshot();
});

describe("avg", () => {
  test("avg", async () => {
    const query = dataCube.query().select({
      raum: raumDimension,
      bep: beschaeftigteMeasure.avg(),
    });
    const sparql = await query.toSparql();
    expect(sparql).toMatchSnapshot();
  });

  test("avg and filter", async () => {
    const query = dataCube
      .query()
      .select({
        raum: raumDimension,
        bep: beschaeftigteMeasure.avg(),
      })
      .filter(raumDimension.not.in([namedNode("http://foo")]))
      .offset(150)
      .limit(50);
    const sparql = await query.toSparql();
    expect(sparql).toMatchSnapshot();
  });

  test("avg has auto groupBy", async () => {
    const sparqlA = await dataCube
      .query()
      .select({
        raum: raumDimension,
        bep: beschaeftigteMeasure.avg(),
      })
      .groupBy("raum")
      .toSparql();
    const sparqlB = await dataCube
      .query()
      .select({
        raum: raumDimension,
        bep: beschaeftigteMeasure.avg(),
      })
      .toSparql();
    expect(sparqlA).toBe(sparqlB);
  });

  test("avg distinct", async () => {
    const query = dataCube.query().select({
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
    }).distinct();
    const sparql = await query.toSparql();
    expect(sparql).toMatchSnapshot();
  });
});

describe("groupBy", () => {
  test("with avg doesn't duplicate groupby vars", async () => {
    const query = dataCube
      .query()
      .select({
        raum: raumDimension,
        zeit: zeitDimension,

        bep: beschaeftigteMeasure.avg().distinct(),
      })
      .distinct()
      .filter(raumDimension.equals("http://something/R3000"))
      .groupBy("zeit")
      .groupBy(({ raum }) => raum);
    const sparql = await query.toSparql();
    expect(sparql).toMatchSnapshot();
  });

  test("groups with a function", async () => {
    const query = dataCube
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
      .groupBy(({ zeit }) => zeit)
      .groupBy(({ raum }) => raum);
    // .having(({ bep }) => bep.gte(10000))
    const sparql = await query.toSparql();
    expect(sparql).toMatchSnapshot();
  });

  test("groups with strings", async () => {
    const base = dataCube.query().select({
      betriebsart: betriebsartDimension,
      geschlecht: geschlechtDimension,
      raum: raumDimension,
      zeit: zeitDimension,

      bep: beschaeftigteMeasure,

      quelle: quelleAttribute,
      glossar: glossarAttribute,
      fussnote: fussnoteAttribute,
    });
    const queryA = base.groupBy(({ zeit }) => zeit).groupBy(({ raum }) => raum);
    const queryB = base.groupBy("zeit").groupBy("raum");
    const sparqlA = await queryA.toSparql();
    const sparqlB = await queryB.toSparql();
    expect(sparqlA).toBe(sparqlB);
  });

  test("reports error when grouping on unknown component", async () => {
    const base = dataCube.query().select({
      betriebsart: betriebsartDimension,
    });
    const query = base.groupBy("foobarbaz");
    expect(query.toSparql()).rejects.toMatchInlineSnapshot(
      `[Error: Cannot group on 'foobarbaz': no component with this name.]`,
    );
  });

  test("doesn't duplicate", async () => {
    const query = dataCube
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
  const base = dataCube.query().select({
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

describe("ordering", () => {
  test("group and filter", async () => {
    const base = dataCube.query().select({
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
      .groupBy(({ raum }) => raum)
      .orderBy(quelleAttribute.desc())
      .orderBy(raumDimension);
    const sparql = await query.toSparql();
    expect(sparql).toMatchSnapshot();
  });

  test("one or many give same sparql", async () => {
    const base = dataCube.query().select({
      raum: raumDimension,
      zeit: zeitDimension,
    });
    const queryBase = base
      .filter(raumDimension.gte(literal("12")))
      .groupBy(({ zeit }) => zeit)
      .groupBy(({ raum }) => raum);
    const queryA = queryBase
      .orderBy(zeitDimension.desc())
      .orderBy(raumDimension);
    const queryB = queryBase.orderBy(zeitDimension.desc(), raumDimension);
    const sparqlA = await queryA.toSparql();
    const sparqlB = await queryB.toSparql();
    expect(sparqlA).toBe(sparqlB);
  });

  test("are ordered", async () => {
    const base = dataCube.query().select({
      raum: raumDimension,
      zeit: zeitDimension,
    });
    const queryBase = base.filter(raumDimension.gte(literal("12")));
    const queryA = queryBase.orderBy(raumDimension, zeitDimension.desc());
    const queryB = queryBase.orderBy(zeitDimension.desc(), raumDimension);
    const sparqlA = await queryA.toSparql();
    const sparqlB = await queryB.toSparql();
    expect(sparqlA).not.toBe(sparqlB);
    expect(sparqlA).toContain("ORDER BY");
    expect(sparqlA).toContain("ORDER BY");
  });
});

describe("handles languages", () => {
  test("one language", async () => {
    const query = dataCube.query({ languages: ["en"] }).select({
      zeit: zeitDimension,

      bep: beschaeftigteMeasure,

      quelle: quelleAttribute,
    });
    const sparql = await query.toSparql();
    expect(sparql).toMatchSnapshot();
  });

  test("two languages", async () => {
    const query = dataCube.query({ languages: ["en", "de"] }).select({
      zeit: zeitDimension,

      bep: beschaeftigteMeasure,

      quelle: quelleAttribute,
    });
    const sparql = await query.toSparql();
    expect(sparql).toMatchSnapshot();
  });

  test("three languages", async () => {
    const query = dataCube.query({ languages: ["fr", "de", "it"] }).select({
      zeit: zeitDimension,

      bep: beschaeftigteMeasure,

      quelle: quelleAttribute,
    });
    const sparql = await query.toSparql();
    expect(sparql).toMatchSnapshot();
    expect(await query.execute()).toMatchSnapshot();
  });
});

describe("filter", () => {
  it("applies 3 filters", async () => {
    const base = dataCube.query().select({
      raum: raumDimension,
      bep: beschaeftigteMeasure,
    });
    const query = base
      .filter(raumDimension.gte(literal("12")))
      .filter(raumDimension.lte(literal("120")))
      .filter(beschaeftigteMeasure.gte(literal("12")));
    const sparql = await query.toSparql();
    expect(extractFilter(sparql).split("&&")).toHaveLength(3);
  });

  it("applies 4 filters", async () => {
    const base = dataCube.query().select({
      raum: raumDimension,
      bep: beschaeftigteMeasure,
    });
    const query = base
      .filter(raumDimension.gte(literal("12")))
      .filter(raumDimension.lte(literal("120")))
      .filter(beschaeftigteMeasure.gte(literal("12")))
      .filter(beschaeftigteMeasure.lt(literal("120")));
    const sparql = await query.toSparql();
    expect(extractFilter(sparql).split("&&")).toHaveLength(4);
  });

  it("builds filters in the order they were given", async () => {
    const base = dataCube.query().select({
      raum: raumDimension,
      bep: beschaeftigteMeasure,
    });
    const filters = ["aaa", "bbb", "ccc", "ddd"];
    const query = base
      .filter(raumDimension.gte(literal(filters[0])))
      .filter(raumDimension.lte(literal(filters[1])))
      .filter(beschaeftigteMeasure.gte(literal(filters[2])))
      .filter(beschaeftigteMeasure.lt(literal(filters[3])));
    const sparql = await query.toSparql();
    extractFilter(sparql).split("&&").forEach((part, index) => {
      expect(part).toContain(filters[index]);
    });
  });
});

describe("auto names variables", () => {
  test("slugifies labels to camelCase", async () => {
    const query = dataCube.query().select({ zeit: zeitDimension });
    const sparql = await query.toSparql();
    expect(sparql).toContain("SELECT ?zeit ?zeitLabel ?raum ?bta ?sex");
  });

  test("doesn't generate name conflicts", async () => {
    // create a cube with a bunch of dimensions with the same label "time" but different IRI,
    // we want to make sure they get bound to different names instead of all becoming `?time`
    const cube = DataCube.fromJSON('{"endpoint":"https://ld.stadt-zuerich.ch/query","iri":"https://ld.stadt-zuerich.ch/statistics/dataset/BES-RAUM-ZEIT-BTA-SEX","graphIri":"https://linked.opendata.swiss/graph/zh/statistics","labels":[{"value":"Beschäftigte nach Betriebsart, Raum, Geschlecht, Zeit","language":"de"}],"languages":[],"components":{"dimensions":[{"componentType":"dimension","iri":"https://ld.stadt-zuerich.ch/statistics/property/ZEIT","labels":[{"value":"time","language":""}]},{"componentType":"dimension","iri":"https://ld.stadt-zuerich.ch/statistics/property/ZEIT","labels":[{"value":"time","language":""}]},{"componentType":"dimension","iri":"https://ld.stadt-zuerich.ch/statistics/property/ZEIT-c","labels":[{"value":"time","language":""}]},{"componentType":"dimension","iri":"https://ld.stadt-zuerich.ch/statistics/property/ZEIT-d","labels":[{"value":"time","language":""}]},{"componentType":"dimension","iri":"https://ld.stadt-zuerich.ch/statistics/property/RAUM","labels":[{"value":"","language":""}]},{"componentType":"dimension","iri":"https://ld.stadt-zuerich.ch/statistics/property/BTA","labels":[{"value":"something fön","language":""}]}],"measures":[],"attributes":[]}}');

    const query = cube.query().select({});
    const sparql = await query.toSparql();
    expect(sparql).not.toContain("?time ?time ");
    expect(sparql).toContain("?time ?time1 ?time2");
  });
});

describe("execute", () => {
  it("returns results in a language", async () => {
    const entryPoint = new DataCubeEntryPoint("https://trifid-lindas.test.cluster.ldbar.ch/query", {
      languages: ["fr", "de"],
      fetcher: {
        fetch,
      },
    });
    const dataCubes = await entryPoint.dataCubes();
    const ds = dataCubes[0];

    const dimensions = await ds.dimensions();
    const measures = await ds.measures();

    const variable = dimensions[0];
    const size = dimensions[1];
    const canton = dimensions[2];

    const query = ds
      .query()
      .select({
        mes: measures[0],
        variable,
        size,
        canton,
      })
      .limit(2);
    expect(await query.execute()).toMatchSnapshot();
  });

  it("returns different results in different languages", async () => {
    const results = [];
    for (const languages of [[], ["fr"]]) {
      const entryPoint = new DataCubeEntryPoint("https://trifid-lindas.test.cluster.ldbar.ch/query", {
        languages,
        fetcher: {
          fetch,
        },
      });
      const dataCubes = await entryPoint.dataCubes();
      const ds = dataCubes[0];

      const dimensions = await ds.dimensions();
      const measures = await ds.measures();

      const variable = dimensions[0];
      const size = dimensions[1];
      const canton = dimensions[2];

      const query = ds
        .query()
        .select({
          mes: measures[0],
          variable,
          size,
          canton,
        })
        .limit(2);
      const res = await query.execute();
      results.push(res);
    }
    expect(results[0]).not.toEqual(results[1]);
  });
});
