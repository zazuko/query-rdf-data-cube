import { DataCubeEntryPoint, EntryPointOptions } from "../src/entrypoint";
import { fetch } from "./utils/fetch-mock";

const newCube = (endpoint: string, languages?: string[]) => {
  const options: EntryPointOptions = {
    fetcher: {
      fetch,
    },
  };
  if (languages) {
    options.languages = languages;
  }
  return new DataCubeEntryPoint(endpoint, options);
};

describe("dataCube", () => {
  it(".componentValues()", async () => {
    const entryPoint = newCube("https://trifid-lindas.test.cluster.ldbar.ch/query");
    const dataCubes = await entryPoint.dataCubes();
    const dataCube = dataCubes[0];

    const dimensions = await dataCube.dimensions();

    const sizeClasses = dimensions[1];

    const values = await dataCube.componentValues(sizeClasses);

    expect(values).toMatchSnapshot();
  });

  it(".componentValues() gets same result as Query.componentValues()", async () => {
    const entryPoint = newCube("https://trifid-lindas.test.cluster.ldbar.ch/query");
    const dataCubes = await entryPoint.dataCubes();
    const dataCube = dataCubes[0];

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
