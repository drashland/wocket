import {Drash} from "../../chat/deps.ts";

export default class  HomeResource extends Drash.Http.Resource {
  static paths = ["/"]

  public GET() {
    this.response.body = this.response.render("/index.html")
    return this.response
  }
}