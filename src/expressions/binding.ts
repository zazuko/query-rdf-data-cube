import { BaseExpr, IExpr } from "./index";

class Binding extends BaseExpr implements IExpr {
  public name: string;

  public constructor(name: string) {
    super();
    this.name = name;
  }
}

export default Binding;
