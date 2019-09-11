import { BaseExpr, IExpr } from "./index";

export class Binding extends BaseExpr implements IExpr {
  public name: string;

  public constructor(name: string) {
    super();
    this.name = name;
  }
}
