import { Drash } from "../../deps.ts";
import { socketServer } from "../../app.ts";
import { messages } from "../messages.ts";
import { Packet } from "../../../../../mod.ts";

export default class HomeResource extends Drash.Http.Resource {
  static paths = ["/"];

  public GET() {
    if (!socketServer.getChannel("Channel 1")) {
      messages["Channel 1"] = {
        messages: [],
      };
      socketServer
        .on("Channel 1", (incomingMessage: Packet) => {
          const { message } = incomingMessage;
          messages["Channel 1"].messages.push({ ...message });
          socketServer.to("Channel 1", incomingMessage);
        });
    }
    this.response.headers.set("Content-Type", "text/html");
    this.response.body = this.response.render("/index.html");
    return this.response;
  }
}
