import { Drash } from "../../deps.ts";
import { socketServer } from "../../app.ts";

export default class ChatResource extends Drash.Http.Resource {
  static paths = [
    "/chat",
    "/chat/:room"
  ];

  public GET() {
    const plugName = decodeURIComponent(this.request.getPathParam("room"));
    console.log(plugName);
    this.response.body = socketServer.plugs[plugName].messages;
    return this.response;
  }

  public POST() {
    switch (this.request.getBodyParam("action")) {
      case "get_rooms":
        let rooms = [];
        for (let name in socketServer.plugs) {
          rooms.push(name);
        }
        this.response.body = rooms;
        break;
      case "create_room":
        const roomName = this.request.getBodyParam("room_name");
        try {
          socketServer.addPlug(roomName);
          this.response.body = `Room "${roomName}" created!`;
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
