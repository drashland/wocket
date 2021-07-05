import { Drash } from "../../deps.ts";
import { socketServer } from "../../app.ts";
import { messages } from "../messages.ts";
import { Packet } from "../../../../../mod.ts";

export default class ChatResource extends Drash.Http.Resource {
  static paths = [
    "/chat",
    "/chat/:channel",
  ];

  public GET() {
    let channel = this.request.getPathParam("channel");
    if (channel !== null) {
      channel = decodeURIComponent(channel);
      this.response.body = messages[channel].messages;
    } else {
      this.response.status_code = 400;
      this.response.body = "Unable to parse the channel param";
    }
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
    if (!channelName) {
      this.response.status_code = 400;
      this.response.body = "Channel name must be passed in";
      return this.response;
    }
    try {
      // Create the channel if it doesn't exist
      if (!socketServer.getChannel(channelName)) {
        messages[channelName] = {
          messages: [],
        };
        socketServer
          .on(channelName, (incomingMessage: Packet) => {
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
