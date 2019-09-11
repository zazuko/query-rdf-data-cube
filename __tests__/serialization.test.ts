import {Attribute, Component, Dimension, Measure} from "../src/components";
import DataCubeEntryPoint from "../src/datacubeentrypoint";
import DataSet from "../src/dataset";
import fetch from "./utils/fetch-mock";

const cube = new DataCubeEntryPoint(
  "https://ld.stadt-zuerich.ch/query", {
  languages: ["it", "ru"],
  fetcher: {
    fetch,
  },
});

describe("entrypoint", () => {
  beforeEach(async () => {
    await cube.datasets();
  });

  it("serializes", () => {
    const serialized = cube.toJSON();
    expect(serialized).toMatchSnapshot();
  });
  it("serialization is idempotent", () => {
    const serialized = cube.toJSON();
    expect(DataCubeEntryPoint.fromJSON(serialized).toJSON()).toBe(serialized);
  });
  it("deserializes", () => {
    const serialized = cube.toJSON();
    expect(DataCubeEntryPoint.fromJSON(serialized)).toBeInstanceOf(DataCubeEntryPoint);
  });
});

describe("dataset", () => {
  beforeEach(async () => {
    await cube.datasets();
  });

  it("serializes", async () => {
    const dataset = (await cube.datasets())[0];
    const serialized = dataset.toJSON();
    expect(serialized).toMatchSnapshot();
  });
  it("serialization is idempotent", async () => {
    const dataset = (await cube.datasets())[0];
    const serialized = dataset.toJSON();
    expect(DataSet.fromJSON(serialized).toJSON()).toBe(serialized);
  });
  it("deserializes", async () => {
    const dataset = (await cube.datasets())[0];
    const serialized = dataset.toJSON();
    expect(DataSet.fromJSON(serialized)).toBeInstanceOf(DataSet);
  });
});

describe("component", () => {
  beforeEach(async () => {
    await cube.datasets();
  });

  it("serializes", async () => {
    const dataset = (await cube.datasets())[0];
    const components = (await dataset.dimensions())[0];
    const serialized = components.toJSON();
    expect(serialized).toMatchSnapshot();
  });
  it("serialization is idempotent", async () => {
    const dataset = (await cube.datasets())[0];
    const components = (await dataset.dimensions())[0];
    const serialized = components.toJSON();
    expect(Component.fromJSON(serialized).toJSON()).toBe(serialized);
  });
  it("deserializes", async () => {
    const dataset = (await cube.datasets())[0];
    const dimensions = (await dataset.dimensions())[0];
    expect(Dimension.fromJSON(dimensions.toJSON())).toBeInstanceOf(Dimension);
    const measures = (await dataset.measures())[0];
    expect(Measure.fromJSON(measures.toJSON())).toBeInstanceOf(Measure);
    const attributes = (await dataset.attributes())[0];
    expect(Attribute.fromJSON(attributes.toJSON())).toBeInstanceOf(Attribute);

    expect(Measure.fromJSON(dimensions.toJSON())).toBeInstanceOf(Dimension);
    expect(Attribute.fromJSON(dimensions.toJSON())).toBeInstanceOf(Dimension);
    expect(Component.fromJSON(dimensions.toJSON())).toBeInstanceOf(Dimension);
  });
});
