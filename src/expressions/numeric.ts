import { IExpr } from "./iexpr";
import { BaseExpr } from "./operator";

/**
 * @ignore
 */
export class Numeric extends BaseExpr implements IExpr {
  private val: number;
  public constructor(value: number) {
    super();
    this.val = value;
  }
}
