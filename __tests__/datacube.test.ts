import { literal } from "@rdfjs/data-model";
import { DataCube } from "../src/datacube";
import { DataCubeEntryPoint, EntryPointOptions, ExtraMetadatum } from "../src/entrypoint";
import { fetch } from "./utils/fetch-mock";

const newCube = (endpoint: string, languages?: string[], extraMetadata?: ExtraMetadatum[]) => {
  const options: EntryPointOptions = {
    fetcher: {
      fetch,
    },
  };
  if (languages) {
    options.languages = languages;
  }
  if (extraMetadata) {
    options.extraMetadata = extraMetadata;
  }
  return new DataCubeEntryPoint(endpoint, options);
};

describe("dataCube", () => {
  describe("methods", () => {
    it(".componentValues()", async () => {
      const entryPoint = newCube("https://trifid-lindas.test.cluster.ldbar.ch/query");
      const dataCube = await entryPoint.dataCubeByIri("http://environment.ld.admin.ch/foen/px/0703030000_124/dataset");
      const dimensions = await dataCube.dimensions();
      const sizeClasses = dimensions[1];
      const values = await dataCube.componentValues(sizeClasses);

      expect(values).toMatchSnapshot();
    });

    it(".componentsValues()", async () => {
      const entryPoint = newCube("https://trifid-lindas.test.cluster.ldbar.ch/query");
      const dataCube = await entryPoint.dataCubeByIri("http://environment.ld.admin.ch/foen/px/0703030000_124/dataset");
      const dimensions = await dataCube.dimensions();
      const values = await dataCube.componentsValues(dimensions);

      expect(dimensions.map((dim) => values.get(dim))).toMatchSnapshot();
    });

    it(".componentValues() gets same result as Query.componentValues()", async () => {
      const entryPoint = newCube("https://trifid-lindas.test.cluster.ldbar.ch/query");
      const dataCube = await entryPoint.dataCubeByIri("http://environment.ld.admin.ch/foen/px/0703030000_124/dataset");

      const dimensions = await dataCube.dimensions();

      const sizeClasses = dimensions[1];

      const values = (await dataCube.componentValues(sizeClasses))
        .filter((value) => value.label.value !== "50 - 100 ha");

      const values2 = await dataCube.query()
        .select({ size: sizeClasses })
        .filter(({ size }) => size.notEquals("50 - 100 ha"))
        .componentValues();

      expect(values).toEqual(values2);
    });

    it(".componentMinMax()", async () => {
      const entryPoint = newCube("https://ld.stadt-zuerich.ch/query");
      const dataCubes = await entryPoint.dataCubes();
      const dataCube = dataCubes.find((cube) => cube.iri.endsWith("BEW-RAUM-ZEIT"));

      const dimensions = await dataCube.dimensions();
      const time = dimensions.find((dimension) => dimension.iri.value.endsWith("/ZEIT"));
      const timeMinMax = await dataCube.componentMinMax(time);

      expect(Object.keys(timeMinMax)).toEqual(["min", "max"]);
      expect(parseInt(timeMinMax.min.value, 10)).toBeLessThan(parseInt(timeMinMax.max.value, 10));

      Object.values(timeMinMax).forEach((value) => {
        expect(value.termType).toBe("Literal");
      });
    });

    it(".componentsMinMax()", async () => {
      const entryPoint = newCube("https://ld.stadt-zuerich.ch/query");
      const dataCubes = await entryPoint.dataCubes();
      const dataCube = dataCubes.find((cube) => cube.iri.endsWith("BEW-RAUM-ZEIT"));

      const dimensions = await dataCube.dimensions();
      const time = dimensions.find((dimension) => dimension.iri.value.endsWith("/ZEIT"));
      const measures = await dataCube.measures();
      const pop = measures.find((measure) => measure.iri.value.endsWith("/BEW"));

      const components = [time, pop];

      const minMaxes = await dataCube.componentsMinMax(components);

      components.forEach((component) => {
        const minMax = minMaxes.get(component);
        expect(Object.keys(minMax)).toEqual(["min", "max"]);
        expect(parseInt(minMax.min.value, 10)).toBeLessThan(parseInt(minMax.max.value, 10));

        Object.values(minMax).forEach((value) => {
          expect(value.termType).toBe("Literal");
        });
      });
    });

    it(".componentMinMax() gets same result as Query.componentValues()", async () => {
      const entryPoint = newCube("https://ld.stadt-zuerich.ch/query");
      const dataCubes = await entryPoint.dataCubes();
      const dataCube = dataCubes.find((cube) => cube.iri.endsWith("BEW-RAUM-ZEIT"));

      const dimensions = await dataCube.dimensions();
      const time = dimensions.find((dimension) => dimension.iri.value.endsWith("/ZEIT"));
      const timeMinMax = await dataCube.componentMinMax(time);

      const timeMinMax2 = await dataCube.query()
        .select({ time })
        .componentMinMax();

      expect(timeMinMax).toEqual(timeMinMax2);

      const timeMinMax3 = await dataCube.query()
        .select({ time })
        .filter(({ time }) => time.gte("1982-04-02"))
        .componentMinMax();

      const minDate = new Date(timeMinMax3.min.value);
      expect(new Date("1982-04-02").getTime()).toBeLessThanOrEqual(minDate.getTime());
      expect(timeMinMax3.max.value).toEqual(timeMinMax2.max.value);
    });
  });

  describe("de/serialize", () => {
    it("serializes", async () => {
      const entryPoint = newCube("https://ld.stadt-zuerich.ch/query", ["de", "en"]);
      const dataCube = (await entryPoint.dataCubes())[0];
      const serialized = dataCube.toJSON();
      expect(serialized).toMatchSnapshot();
    });

    it("serializes with languages", async () => {
      const entryPoint = newCube("https://ld.stadt-zuerich.ch/query", ["de", "en"]);
      const dataCube = (await entryPoint.dataCubes())[0];
      const serialized = dataCube.toJSON();
      expect(serialized).toMatchSnapshot();
    });

    it("serializes with languages and metadata", async () => {
      const entryPoint = newCube("https://trifid-lindas.test.cluster.ldbar.ch/query", ["fr", "de"], [
        { variable: "contact", iri: "https://pcaxis.described.at/contact", multilang: true },
        { variable: "source", iri: "https://pcaxis.described.at/source", multilang: true },
        { variable: "survey", iri: "https://pcaxis.described.at/survey", multilang: true },
        { variable: "database", iri: "https://pcaxis.described.at/database", multilang: true },
        { variable: "unit", iri: "https://pcaxis.described.at/unit", multilang: true },
        { variable: "note", iri: "https://pcaxis.described.at/note", multilang: true },

        { variable: "dateCreated", iri: "http://schema.org/dateCreated", multilang: false },
        { variable: "dateModified", iri: "http://schema.org/dateModified" },
        { variable: "temporalCoverage", iri: "http://schema.org/temporalCoverage", multilang: true },
        { variable: "description", iri: "http://www.w3.org/2000/01/rdf-schema#comment", multilang: true },
      ]);
      const dataCube = await entryPoint.dataCubeByIri("http://environment.ld.admin.ch/foen/px/0703030000_124/dataset");
      const serialized = dataCube.toJSON();
      expect(serialized).toMatchSnapshot();
    });

    it("de/serializes loaded components", async () => {
      const entryPoint = newCube("https://trifid-lindas.test.cluster.ldbar.ch/query", ["de", "en"]);
      const dataCube = await entryPoint.dataCubeByIri("http://environment.ld.admin.ch/foen/px/0703030000_124/dataset");
      await dataCube.dimensions();
      const serialized = dataCube.toJSON();
      expect(serialized).toMatchSnapshot();
      expect(DataCube.fromJSON(serialized).toJSON()).toBe(serialized);
    });

    it("serialization is idempotent", async () => {
      const entryPoint = newCube("https://trifid-lindas.test.cluster.ldbar.ch/query", ["de", "en"], [
        { variable: "contact", iri: "https://pcaxis.described.at/contact", multilang: true },
        { variable: "source", iri: "https://pcaxis.described.at/source", multilang: true },
        { variable: "survey", iri: "https://pcaxis.described.at/survey", multilang: true },
        { variable: "database", iri: "https://pcaxis.described.at/database", multilang: true },
        { variable: "unit", iri: "https://pcaxis.described.at/unit", multilang: true },
        { variable: "note", iri: "https://pcaxis.described.at/note", multilang: true },

        { variable: "dateCreated", iri: "http://schema.org/dateCreated", multilang: false },
        { variable: "dateModified", iri: "http://schema.org/dateModified" },
        { variable: "temporalCoverage", iri: "http://schema.org/temporalCoverage", multilang: true },
        { variable: "description", iri: "http://www.w3.org/2000/01/rdf-schema#comment", multilang: true },
      ]);
      const dataCube = await entryPoint.dataCubeByIri("http://environment.ld.admin.ch/foen/px/0703030000_124/dataset");
      const serialized = dataCube.toJSON();
      expect(DataCube.fromJSON(serialized).toJSON()).toBe(serialized);
    });

    it("deserializes", async () => {
      const entryPoint = newCube("https://trifid-lindas.test.cluster.ldbar.ch/query", ["de", "en"], [
        { variable: "contact", iri: "https://pcaxis.described.at/contact", multilang: true },
        { variable: "source", iri: "https://pcaxis.described.at/source", multilang: true },
        { variable: "survey", iri: "https://pcaxis.described.at/survey", multilang: true },
        { variable: "database", iri: "https://pcaxis.described.at/database", multilang: true },
        { variable: "unit", iri: "https://pcaxis.described.at/unit", multilang: true },
        { variable: "note", iri: "https://pcaxis.described.at/note", multilang: true },

        { variable: "dateCreated", iri: "http://schema.org/dateCreated", multilang: false },
        { variable: "dateModified", iri: "http://schema.org/dateModified" },
        { variable: "temporalCoverage", iri: "http://schema.org/temporalCoverage", multilang: true },
        { variable: "description", iri: "http://www.w3.org/2000/01/rdf-schema#comment", multilang: true },
      ]);
      const dataCube = await entryPoint.dataCubeByIri("http://environment.ld.admin.ch/foen/px/0703030000_124/dataset");
      const serialized = dataCube.toJSON();
      expect(DataCube.fromJSON(serialized)).toBeInstanceOf(DataCube);
    });
  });

  it("gets extra metadata", async () => {
    const extraMetadata = [
      { variable: "contact", iri: "https://pcaxis.described.at/contact", multilang: true },
      { variable: "source", iri: "https://pcaxis.described.at/source", multilang: true },
      { variable: "survey", iri: "https://pcaxis.described.at/survey", multilang: true },
      { variable: "database", iri: "https://pcaxis.described.at/database", multilang: true },
      { variable: "unit", iri: "https://pcaxis.described.at/unit", multilang: true },
      { variable: "note", iri: "https://pcaxis.described.at/note", multilang: true },

      { variable: "dateCreated", iri: "http://schema.org/dateCreated", multilang: false },
      { variable: "dateModified", iri: "http://schema.org/dateModified" },
      { variable: "temporalCoverage", iri: "http://schema.org/temporalCoverage", multilang: true },
      { variable: "description", iri: "http://www.w3.org/2000/01/rdf-schema#comment", multilang: true },
    ];
    const extraMetadataKeys = extraMetadata.map((metadata) => metadata.variable);
    const entryPoint = newCube(
      "https://trifid-lindas.test.cluster.ldbar.ch/query",
      ["fr", "de"],
      extraMetadata);
    const dataCubes = await entryPoint.dataCubes();
    dataCubes.forEach((cube) => {
      expect(Array.from(cube.extraMetadata.keys())).toEqual(extraMetadataKeys);
    });

    const dataCube = await entryPoint.dataCubeByIri("http://environment.ld.admin.ch/foen/px/0703030000_124/dataset");
    expect(dataCube.extraMetadata).toMatchSnapshot();

    extraMetadataKeys.forEach((key) => {
      expect(dataCube.extraMetadata.get(key)).toBeInstanceOf(literal("").constructor);
    });
  });
});
