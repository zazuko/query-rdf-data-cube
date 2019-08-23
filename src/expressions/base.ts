import { NamedNode } from "rdf-js";
import {inspect} from "util";
import { IExpr, IntoExpr } from "./utils";

function l(obj: any) {
  return inspect(obj, false, 10000, true);
}

class BaseExpr implements IExpr {
  public resolve(mapping: Map<IExpr, string>): IExpr {
    return this;
  }

  // filters
  public get not() {
    return new Operator("!", [this]);
  }

  public bound() {
    return new Operator("bound", [this]);
  }

  public gte(inArg: IntoExpr) {
    return new Operator("gte", [this, inArg]);
  }

  public in(inArg: NamedNode[]) {
    return new Operator("in", [this, ...inArg]);
    // const lastFilter = this.filters.pop();
    // if (lastFilter && lastFilter([]).operator === "!") {
    //   return this.pushFilter(filter("notin", ...inArg));
    // }
    // this.filters.push(lastFilter);
    // return this.pushFilter(filter("in", inArg));
  }
}

export default BaseExpr;

// for cyclic dependencies
import Operator from "./operator";
