import { BaseExpr, IExpr } from "./index";

export class Numeric extends BaseExpr implements IExpr {
  private val: number;
  public constructor(value: number) {
    super();
    this.val = value;
  }
}
