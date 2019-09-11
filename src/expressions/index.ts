
export interface IExpr {
  resolve(mapping: Map<string, string>): IExpr;
}

export { default as BaseExpr } from "./base";
export * from "./utils";
export { default as Operator } from "./operator";
export { default as Binding } from "./binding";

