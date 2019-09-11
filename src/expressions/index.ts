export interface IExpr {
  resolve(mapping: Map<string, string>): IExpr;
}

export { BaseExpr } from "./base";
export * from "./utils";
export { Operator } from "./operator";
export { Binding } from "./binding";
