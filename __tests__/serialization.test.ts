import { Attribute, Component, Dimension, Measure } from "../src/components";
import { DataCube } from "../src/datacube";
import { DataCubeEntryPoint } from "../src/entrypoint";
import { fetch } from "./utils/fetch-mock";

const cubeEntryPoint = new DataCubeEntryPoint(
  "https://ld.stadt-zuerich.ch/query", {
  languages: ["de", "en"],
  fetcher: {
    fetch,
  },
});

describe("entrypoint", () => {
  beforeEach(async () => {
    await cubeEntryPoint.dataCubes();
  });

  it("serializes", () => {
    const serialized = cubeEntryPoint.toJSON();
    expect(serialized).toMatchSnapshot();
  });
  it("serialization is idempotent", () => {
    const serialized = cubeEntryPoint.toJSON();
    expect(DataCubeEntryPoint.fromJSON(serialized).toJSON()).toBe(serialized);
  });
  it("deserializes", () => {
    const serialized = cubeEntryPoint.toJSON();
    expect(DataCubeEntryPoint.fromJSON(serialized)).toBeInstanceOf(DataCubeEntryPoint);
  });
});

describe("dataCube", () => {
  beforeEach(async () => {
    await cubeEntryPoint.dataCubes();
  });

  it("serializes", async () => {
    const dataCube = (await cubeEntryPoint.dataCubes())[0];
    const serialized = dataCube.toJSON();
    expect(serialized).toMatchSnapshot();
  });
  it("de/serializes loaded components", async () => {
    const dataCube = (await cubeEntryPoint.dataCubes())[0];
    await dataCube.dimensions();
    const serialized = dataCube.toJSON();
    expect(serialized).toMatchSnapshot();
    expect(DataCube.fromJSON(serialized).toJSON()).toBe(serialized);
  });
  it("serialization is idempotent", async () => {
    const dataCube = (await cubeEntryPoint.dataCubes())[0];
    const serialized = dataCube.toJSON();
    expect(DataCube.fromJSON(serialized).toJSON()).toBe(serialized);
  });
  it("deserializes", async () => {
    const dataCube = (await cubeEntryPoint.dataCubes())[0];
    const serialized = dataCube.toJSON();
    expect(DataCube.fromJSON(serialized)).toBeInstanceOf(DataCube);
  });
});

describe("component", () => {
  beforeEach(async () => {
    await cubeEntryPoint.dataCubes();
  });

  it("serializes", async () => {
    const dataCube = (await cubeEntryPoint.dataCubes())[0];
    const components = (await dataCube.dimensions())[0];
    const serialized = components.toJSON();
    expect(serialized).toMatchSnapshot();
  });
  it("serialization is idempotent", async () => {
    const dataCube = (await cubeEntryPoint.dataCubes())[0];
    const components = (await dataCube.dimensions())[0];
    const serialized = components.toJSON();
    expect(Component.fromJSON(serialized).toJSON()).toBe(serialized);
  });
  it("deserializes", async () => {
    const dataCube = (await cubeEntryPoint.dataCubes())[0];
    const dimensions = (await dataCube.dimensions())[0];
    expect(Dimension.fromJSON(dimensions.toJSON())).toBeInstanceOf(Dimension);
    const measures = (await dataCube.measures())[0];
    expect(Measure.fromJSON(measures.toJSON())).toBeInstanceOf(Measure);
    const attributes = (await dataCube.attributes())[0];
    expect(Attribute.fromJSON(attributes.toJSON())).toBeInstanceOf(Attribute);

    expect(Measure.fromJSON(dimensions.toJSON())).toBeInstanceOf(Dimension);
    expect(Attribute.fromJSON(dimensions.toJSON())).toBeInstanceOf(Dimension);
    expect(Component.fromJSON(dimensions.toJSON())).toBeInstanceOf(Dimension);
  });
});
