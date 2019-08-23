import { namedNode } from "@rdfjs/data-model";
import Dimension from "./expressions/dimension";

let d = null;

describe("filters", () => {
  beforeAll(() => {
    d = new Dimension({ label: "d", iri: "http://example.com/d" });
  });

  test("bound", () => {
    expect(d.bound()).toMatchSnapshot();
  });

  test("not bound", () => {
    expect(d.bound().not).toMatchSnapshot();
  });

  test("not in", () => {
    expect(d.in([namedNode("http://foo")]).not).toMatchSnapshot();
  });
});
