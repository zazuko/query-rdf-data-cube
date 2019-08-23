import BaseExpr from "./base";
import { IExpr } from "./utils";

class Binding extends BaseExpr implements IExpr {
  public name: string;

  public constructor(name: string) {
    super();
    this.name = name;
  }
}

export default Binding;
