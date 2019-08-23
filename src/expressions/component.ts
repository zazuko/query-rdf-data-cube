import { literal, namedNode, variable } from "@rdfjs/data-model";
import clone from "clone";
import { NamedNode, Term, Variable } from "rdf-js";
import { Expression, FilterPattern, OperationExpression } from "../sparqljs";
import BaseExpr from "./base";
import Binding from "./binding";
import Operator from "./operator";
import { IExpr, IntoExpr } from "./utils";

class Component extends BaseExpr {
  public label: Term;
  public iri: Term;
  public aggregateType: string;
  public isDistinct: boolean = false;
  public componentType: string = "";

  constructor({ label, iri }: { label: string | Term, iri: string | Term}) {
    super();
    if (typeof label === "string") {
      this.label = literal(label);
    } else {
      this.label = label;
    }
    if (typeof iri === "string") {
      this.iri = namedNode(iri);
    } else {
      this.iri = iri;
    }
  }

  public clone() {
    const Constructor = Object.getPrototypeOf(this).constructor;
    const state = {label: this.label, iri: this.iri};
    const instance = new Constructor(state);
    instance.aggregateType = this.aggregateType;
    instance.isDistinct = this.isDistinct;
    return instance;
  }

  public avg() {
    const self = this.clone();
    self.aggregateType = "avg";
    return self;
  }

  public distinct() {
    const self = this.clone();
    self.isDistinct = true;
    return self;
  }

  public resolve(mapping: Map<IExpr, string>): IExpr {
    return new Binding(mapping.get(this));
  }

  // // filter generator
  // public getFilter(bindingName: string): FilterPattern {
  //   let filterToApply;
  //   let result = variable(bindingName);

  //   do {
  //     filterToApply = this.filters.pop();
  //     result = filterToApply(result);
  //   } while (this.filters.length);

  //   return {
  //     type: "filter",
  //     expression: result,
  //   };
  // }

  // public pushFilter(filterFn) {
  //   const self = this.clone();
  //   self.filters.push(filterFn);
  //   return self;
  // }
}

// const operatorsMap = {
//   "not": "!",
//   "gt": ">",
//   "gte": ">=",
//   "lt": "<",
//   "lte": "<=",
//   "equals": "=",
//   "and": "&&",
//   "or": "||",
//   "not in": "notin",
// };

// function filter(operator: string, ...args: any[]): ((args: any[]) => OperationExpression) {
//   // if (args.length) {
//   //   return () => ({
//   //     type: "operation",
//   //     operator,
//   //     args,
//   //   });
//   // }
//   return (...argsToApply) => {
//     return {
//       type: "operation",
//       operator,
//       args: argsToApply.concat(...args),
//     };
//   };
// }
export default Component;
