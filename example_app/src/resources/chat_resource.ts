import { Drash } from "../../deps.ts";
import { socketServer } from "../../app.ts";

export default class ChatResource extends Drash.Http.Resource {
  static paths = [
    "/chat",
    "/chat/:channel"
  ];

  public GET() {
    const channel = decodeURIComponent(this.request.getPathParam("channel"));
    this.response.body = socketServer.getChannels()[channel].messages;
    return this.response;
  }

  public POST() {
    switch (this.request.getBodyParam("action")) {
      case "get_channels":
        this.response.body = socketServer.getChannels();
        break;
      case "create_channel":
        const channelName = this.request.getBodyParam("room_name");
        try {
          socketServer
            .addChannel(channelName)
            .on((incomingEvent: any) => {
              const { message } = incomingEvent;
              socketServer.getChannel(channelName).messages.push({ ...message });
              socketServer.to(channelName, incomingEvent);
            });
          this.response.body = `Channel "${channelName}" created!`;
        } catch (error) {
          throw new Drash.Exceptions.HttpException(400, error);
        }
        break;
      default:
        this.response.body = {
          errors: {
            action: "Field `action` is required."
          }
        };
    }

    return this.response;
  }
}