import { Drash } from "../deps.ts";
import { io } from "./app.ts";
import { decodeHTML } from "./helper.ts";

export default class ChatResource extends Drash.Http.Resource {
  static paths = ["/", "/chat"];

  public GET() {
    if (this.request.url_path === "/") {
      this.response.body = decodeHTML("./index");
    } else {
      this.response.body = io.messages;
      this.response.headers.set("Content-Type", "application/json");
    }

    return this.response;
  }
}
