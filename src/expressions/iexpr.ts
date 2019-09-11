/**
 * @ignore
 */
export interface IExpr {
  resolve(mapping: Map<string, string>): IExpr;
}
