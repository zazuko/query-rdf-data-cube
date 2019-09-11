import { BaseExpr, IExpr } from "./index";

class Numeric extends BaseExpr implements IExpr {
  private val: number;
  public constructor(value: number) {
    super();
    this.val = value;
  }
}

export default Numeric;
