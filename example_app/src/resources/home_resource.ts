import { Drash } from "../../deps.ts";
import { socketServer } from "../../app.ts";
import { messages } from "../messages.ts";

export default class HomeResource extends Drash.Http.Resource {
  static paths = ["/"];

  public GET() {
    const channel = socketServer.getChannel("Channel 1");
    if (!channel) {
      messages["Channel 1"] = {
        messages: []
      };
      socketServer
        .createChannel("Channel 1")
        .onMessage((incomingMessage: any) => {
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
