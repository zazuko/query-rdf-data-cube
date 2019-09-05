import { namedNode } from "@rdfjs/data-model";
import Dimension from "../components/dimension";

let d = null;

describe("filters", () => {
  beforeAll(() => {
    d = new Dimension({ labels: [{value: "d", language: ""}], iri: "http://example.com/d" });
  });

  test("bound", () => {
    expect(d.bound()).toMatchSnapshot();
  });

  test("not bound", () => {
    expect(d.not.bound()).toMatchSnapshot();
  });

  test("not in", () => {
    expect(d.not.in([namedNode("http://foo")])).toMatchSnapshot();
  });
});
