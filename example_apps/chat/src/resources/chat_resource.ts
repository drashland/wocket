import { Drash } from "../../deps.ts";
import { socketServer } from "../../app.ts";
import { messages } from "../messages.ts";

export default class ChatResource extends Drash.Http.Resource {
  static paths = [
    "/chat",
    "/chat/:channel",
  ];

  public GET() {
    const channel = decodeURIComponent(this.request.getPathParam("channel"));
    this.response.body = messages[channel].messages;
    return this.response;
  }

  public POST() {
    switch (this.request.getBodyParam("action")) {
      case "get_channels":
        return this.getChannels();
      case "create_channel":
        return this.createChannel();
      default:
        this.response.body = {
          errors: {
            action: "Field `action` is required.",
          },
        };
        return this.response;
    }
  }

  protected createChannel(): Drash.Http.Response {
    const channelName = this.request.getBodyParam("channel_name");
    try {
      // Create the channel if it doesn't exist
      if (!socketServer.getChannel(channelName)) {
        messages[channelName] = {
          messages: [],
        };
        socketServer
          .createChannel(channelName)
          .onMessage((incomingMessage: any) => {
            const { message } = incomingMessage;
            messages[channelName].messages.push({ ...message });
            socketServer.to(channelName, incomingMessage);
          });
        // Any client listening to "create_channel" will receive the
        // following message
        socketServer.broadcast(
          "create_channel",
          `Channel "${channelName}" created!`,
        );
      }
      this.response.body = `Channel "${channelName}" created!`;
    } catch (error) {
      throw new Drash.Exceptions.HttpException(400, error);
    }
    return this.response;
  }

  protected getChannels(): Drash.Http.Response {
    this.response.body = socketServer.getChannels();
    return this.response;
  }
}
