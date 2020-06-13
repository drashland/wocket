import { Drash } from "../../deps.ts";
import { socketServer } from "../../app.ts";

export default class ChatResource extends Drash.Http.Resource {
  static paths = [
    "/chat",
    "/chat/:channel",
  ];

  public GET() {
    const channel = decodeURIComponent(this.request.getPathParam("channel"));
    this.response.body = socketServer.getChannel(channel).messages;
    return this.response;
  }

  public POST() {
    switch (this.request.getBodyParam("action")) {
      case "get_channels":
        this.response.body = socketServer.getChannels();
        break;
      case "create_channel":
        const channelName = this.request.getBodyParam("channel_name");
        try {
          socketServer
            .createChannel(channelName)
            .onMessage((incomingMessage: any) => {
              const { message } = incomingMessage;
              socketServer.getChannel(channelName).messages.push(
                { ...message },
              );
              socketServer.to(channelName, incomingMessage);
            });
            socketServer.to("create_channel", `Channel "${channelName}" created!`);
          this.response.body = `Channel "${channelName}" created!`;
        } catch (error) {
          throw new Drash.Exceptions.HttpException(400, error);
        }
        break;
      default:
        this.response.body = {
          errors: {
            action: "Field `action` is required.",
          },
        };
        break;
    }

    return this.response;
  }
}
