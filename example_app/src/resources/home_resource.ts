import { Drash } from "../../deps.ts";

export default class HomeResource extends Drash.Http.Resource {
  static paths = ["/"];

  public GET() {
    this.response.headers.set("Content-Type", "text/html");
    this.response.body = this.response.render("/index.html");
    return this.response;
  }
}
