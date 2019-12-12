// tslint:disable: no-shadowed-variable

import { literal, namedNode } from "@rdfjs/data-model";
import { Attribute, Component, Dimension, Measure } from "../src/components";
import { DataCube } from "../src/datacube";
import { DataCubeEntryPoint } from "../src/entrypoint";
import {
  extractFilter,
  extractKeyword,
  extractKeywords,
  extractLimit,
  extractSelect,
} from "./filter.test";
import { fetch } from "./utils/fetch-mock";

const entryPoint = new DataCubeEntryPoint(
  "https://trifid-lindas.test.cluster.ldbar.ch/query",
  {
    languages: ["de"],
    fetcher: {
      fetch,
    },
  },
);

let dataCube: DataCube;
let animalType: Component;
let epidemic: Component;
let epidemicSpecification: Component;
let reason: Component;

describe("broader", () => {
  beforeAll(async () => {
    [dataCube] = await entryPoint.dataCubesByGraphIri(
      "https://linked.opendata.swiss/graph/blv/animalpest",
    );
  });
  beforeEach(async () => {
    [
      animalType,
      epidemic,
      epidemicSpecification,
      reason,
    ] = await dataCube.dimensions();
  });

  test("one level loose", async () => {
    const query = dataCube.query().select({
      animalType,
      animalGroup: animalType.broader(),
      epidemic,
      epidemicGroup: epidemic.broader(),
      epidemicSpecification,
      reason,
    });
    const sparql = await query.toSparql();
    const select = extractSelect(sparql).split(" ");
    expect(select).toMatchInlineSnapshot(`
      Array [
        "SELECT",
        "?animalType",
        "?animalTypeLabel",
        "?epidemic",
        "?epidemicLabel",
        "?epidemicSpecification",
        "?epidemicSpecificationLabel",
        "?reason",
        "?reasonLabel",
        "?animalGroup",
        "?animalGroupLabel",
        "?epidemicGroup",
        "?epidemicGroupLabel",
        "FROM",
        "<https://linked.opendata.swiss/graph/blv/animalpest>",
      ]
    `);
    const broader = extractKeywords("skos:broader", sparql, true);
    expect(broader).toMatchInlineSnapshot(`
      Array [
        "?animalType skos:broader ?animalGroup.",
        "?epidemic skos:broader ?epidemicGroup.",
      ]
    `);
  });

  test("one level pinned", async () => {
    const query = dataCube.query().select({
      animalType,
      animalGroup: animalType.broader(
        "http://ld.zazuko.com/animalpest/species/group/bunny",
      ),
      epidemic,
      epidemicSpecification,
      reason,
    });
    const sparql = await query.toSparql();
    const select = extractSelect(sparql).split(" ");
    expect(select).toMatchInlineSnapshot(`
      Array [
        "SELECT",
        "?animalType",
        "?animalTypeLabel",
        "?epidemic",
        "?epidemicLabel",
        "?epidemicSpecification",
        "?epidemicSpecificationLabel",
        "?reason",
        "?reasonLabel",
        "?animalGroup",
        "?animalGroupLabel",
        "FROM",
        "<https://linked.opendata.swiss/graph/blv/animalpest>",
      ]
    `);
    const broader = extractKeywords("skos:broader", sparql, true);
    expect(broader).toMatchInlineSnapshot(`
      Array [
        "?animalType skos:broader <http://ld.zazuko.com/animalpest/species/group/bunny>.",
      ]
    `);
  });

  test("one level both", async () => {
    const query = dataCube.query().select({
      animalType,
      animalGroup: animalType.broader(
        "http://ld.zazuko.com/animalpest/species/group/bunny",
      ),
      epidemic,
      epidemicGroup: epidemic.broader(),
      epidemicSpecification,
      reason,
    });
    const sparql = await query.toSparql();
    const select = extractSelect(sparql).split(" ");
    expect(select).toMatchInlineSnapshot(`
      Array [
        "SELECT",
        "?animalType",
        "?animalTypeLabel",
        "?epidemic",
        "?epidemicLabel",
        "?epidemicSpecification",
        "?epidemicSpecificationLabel",
        "?reason",
        "?reasonLabel",
        "?animalGroup",
        "?animalGroupLabel",
        "?epidemicGroup",
        "?epidemicGroupLabel",
        "FROM",
        "<https://linked.opendata.swiss/graph/blv/animalpest>",
      ]
    `);
    const broader = extractKeywords("skos:broader", sparql, true);
    expect(broader).toMatchInlineSnapshot(`
      Array [
        "?animalType skos:broader <http://ld.zazuko.com/animalpest/species/group/bunny>.",
        "?epidemic skos:broader ?epidemicGroup.",
      ]
    `);
  });

  test("each loose level", async () => {
    const entryPoint = new DataCubeEntryPoint(
      "https://ld.stadt-zuerich.ch/query",
      {
        fetcher: { fetch },
        languages: ["de"],
      },
    );
    const dataCubes = await entryPoint.dataCubes();
    const dataCube = dataCubes.find((cube) => cube.iri.endsWith("BEW-RAUM-ZEIT"));

    const dimensions = await dataCube.dimensions();
    const zeit = dimensions.find((dimension) =>
      dimension.iri.value.endsWith("/ZEIT"),
    );
    const raum = dimensions.find((dimension) =>
      dimension.iri.value.endsWith("/RAUM"),
    );

    const raumIn = raum.broader();
    const quartier = raumIn.broader();
    const kreis = quartier.broader();
    const gemeinde = kreis.broader();
    const kanton = gemeinde.broader();
    const land = kanton.broader();
    const kontinent = land.broader();
    const query = dataCube.query().select({
      zeit,
      raum,
      raumIn,
      quartier,
      kreis,
      gemeinde,
      kanton,
      land,
      kontinent,
    });
    const sparql = await query.toSparql();
    const select = extractSelect(sparql).split(" ");
    expect(select).toMatchInlineSnapshot(`
      Array [
        "SELECT",
        "?zeit",
        "?zeitLabel",
        "?raum",
        "?raumLabel",
        "?raumIn",
        "?raumInLabel",
        "?quartier",
        "?quartierLabel",
        "?kreis",
        "?kreisLabel",
        "?gemeinde",
        "?gemeindeLabel",
        "?kanton",
        "?kantonLabel",
        "?land",
        "?landLabel",
        "?kontinent",
        "?kontinentLabel",
        "FROM",
        "<https://linked.opendata.swiss/graph/zh/statistics>",
      ]
    `);
    const broader = extractKeywords("skos:broader", sparql, true);
    expect(broader).toMatchInlineSnapshot(`
      Array [
        "?raum skos:broader ?raumIn.",
        "?raumIn skos:broader ?quartier.",
        "?quartier skos:broader ?kreis.",
        "?kreis skos:broader ?gemeinde.",
        "?gemeinde skos:broader ?kanton.",
        "?kanton skos:broader ?land.",
        "?land skos:broader ?kontinent.",
      ]
    `);
  });

  test("one deep loose level", async () => {
    const entryPoint = new DataCubeEntryPoint(
      "https://ld.stadt-zuerich.ch/query",
      {
        fetcher: { fetch },
        languages: ["de"],
      },
    );
    const dataCubes = await entryPoint.dataCubes();
    const dataCube = dataCubes.find((cube) => cube.iri.endsWith("BEW-RAUM-ZEIT"));

    const dimensions = await dataCube.dimensions();
    const zeit = dimensions.find((dimension) =>
      dimension.iri.value.endsWith("/ZEIT"),
    );
    const raum = dimensions.find((dimension) =>
      dimension.iri.value.endsWith("/RAUM"),
    );

    const query = dataCube.query().select({
      zeit,
      raum,
      kontinent: raum
        .broader()
        .broader()
        .broader()
        .broader()
        .broader()
        .broader()
        .broader(),
    });
    const sparql = await query.toSparql();
    const select = extractSelect(sparql).split(" ");
    expect(select).toMatchInlineSnapshot(`
      Array [
        "SELECT",
        "?zeit",
        "?zeitLabel",
        "?raum",
        "?raumLabel",
        "?kontinent",
        "?kontinentLabel",
        "FROM",
        "<https://linked.opendata.swiss/graph/zh/statistics>",
      ]
    `);
    const broader = extractKeywords("skos:broader", sparql, true);
    expect(broader).toMatchInlineSnapshot(`
      Array [
        "?raum skos:broader ?raum1.",
        "?raum1 skos:broader ?raum2.",
        "?raum2 skos:broader ?raum3.",
        "?raum3 skos:broader ?raum4.",
        "?raum4 skos:broader ?raum5.",
        "?raum5 skos:broader ?raum6.",
        "?raum6 skos:broader ?kontinent.",
      ]
    `);
  });

  test("one deep pinned level", async () => {
    const entryPoint = new DataCubeEntryPoint(
      "https://ld.stadt-zuerich.ch/query",
      {
        fetcher: { fetch },
        languages: ["de"],
      },
    );
    const dataCubes = await entryPoint.dataCubes();
    const dataCube = dataCubes.find((cube) => cube.iri.endsWith("BEW-RAUM-ZEIT"));

    const dimensions = await dataCube.dimensions();
    const zeit = dimensions.find((dimension) =>
      dimension.iri.value.endsWith("/ZEIT"),
    );
    const raum = dimensions.find((dimension) =>
      dimension.iri.value.endsWith("/RAUM"),
    );
    const kontinent = raum
      .broader()
      .broader()
      .broader()
      .broader()
      .broader()
      .broader()
      .broader("https://ld.stadt-zuerich.ch/statistics/code/Kontinent");

    const query = dataCube.query().select({
      zeit,
      raum,
      kontinent,
    });
    const sparql = await query.toSparql();
    const select = extractSelect(sparql).split(" ");
    expect(select).toMatchInlineSnapshot(`
      Array [
        "SELECT",
        "?zeit",
        "?zeitLabel",
        "?raum",
        "?raumLabel",
        "?kontinent",
        "?kontinentLabel",
        "FROM",
        "<https://linked.opendata.swiss/graph/zh/statistics>",
      ]
    `);
    const broader = extractKeywords("skos:broader", sparql, true);
    expect(broader).toMatchInlineSnapshot(`
      Array [
        "?raum skos:broader ?raum1.",
        "?raum1 skos:broader ?raum2.",
        "?raum2 skos:broader ?raum3.",
        "?raum3 skos:broader ?raum4.",
        "?raum4 skos:broader ?raum5.",
        "?raum5 skos:broader ?raum6.",
        "?raum6 skos:broader <https://ld.stadt-zuerich.ch/statistics/code/Kontinent>.",
      ]
    `);
  });
});
