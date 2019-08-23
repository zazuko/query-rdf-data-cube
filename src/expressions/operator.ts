import BaseExpr from "./base";
import { IExpr, into, IntoExpr } from "./utils";

class Operator extends BaseExpr implements IExpr {
  private operator: string;
  private args: IExpr[];

  public constructor(operator: string, args: IntoExpr[]) {
    super();
    this.operator = operator;
    this.args = args.map(into);
  }

  public resolve(mapping: Map<IExpr, string>): Operator {
    return new Operator(this.operator, this.args.map((arg) => arg.resolve(mapping)));
  }
}

export default Operator;
