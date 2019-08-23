import Component from "./component";
import Dimension from "./dimension";
import Operator from "./operator";
import { IExpr } from "./utils";

type Selects = Record<string, IExpr>;

type Filter = IExpr;
type FilterResolver = (arg0: Selects) => Filter;
type FilterArg = Filter | FilterResolver;

class Query {
  private filters: FilterArg[] = [];
  private selects: Selects = {};

  public select(what: Selects): Query {
    Object.assign(this.selects, what);
    return this;
  }

  public filter(filter: FilterArg): Query {
    this.filters.push(filter);
    return this;
  }

  public execute(): IExpr[] {
    const selects: Selects = this.selects;
    const filters: Filter[] =
      this.filters.map((filter) => typeof filter === "function" ? filter(this.selects) : filter);
    const mapping = this.generateMapping();
    const resolvedFilters = filters.map((filter) => filter.resolve(mapping));
    return resolvedFilters;
  }

  private generateMapping(): Map<IExpr, string> {
    const mapping = new Map();
    for (const [binding, component] of Object.entries(this.selects)) {
      if (!mapping.has(component)) {
        mapping.set(component, binding);
      }
    }

    return mapping;
  }
}

test("basic", () => {
  const a: any = new Dimension({ label: "aaaa", iri: "http://aaaa.aaa" });
  const b: any = new Dimension({ label: "bbbb", iri: "http://bbbb.bbb" });

  expect(new Query().select({ a, b }).filter(a).execute()).toMatchSnapshot();

  expect(
    new Query()
    .select({ a, b })
    .filter(a)
    .filter(b)
    .filter(new Operator("gte", [a, b]))
    .execute(),
  ).toMatchSnapshot();

  expect(
    new Query()
    .select({ a, b })
    .filter(a.gte(b))
    .execute(),
  ).toMatchSnapshot();

  expect(
    new Query()
    .select({ a, b })
    .filter(a.gte(10).not)
    .execute(),
  ).toMatchSnapshot();
  expect(a.gte(10)).toMatchSnapshot();
});
