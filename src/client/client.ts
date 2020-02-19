import {
  connectWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  isWebSocketPongEvent
} from "../../deps.ts";
import { BufReader } from "../../deps.ts";
import { TextProtoReader } from "../../deps.ts";
import { blue, red, yellow } from "../../deps.ts";


export default class SocketClient {
  protected socket: any;
  
  public async attach() {
    this.socket = await connectWebSocket("ws://127.0.0.1:3000");
    console.log("Connected to socket server.");
    (async function(socket): Promise<void> {
      for await (const msg of socket.receive()) {
        if (typeof msg === "string") {
          console.log(yellow(`Incoming message: ${msg}`));
        } else if (isWebSocketPingEvent(msg)) {
          console.log(blue("Pinging server ..."));
        } else if (isWebSocketPongEvent(msg)) {
          console.log(blue("Server response: pong"));
        } else if (isWebSocketCloseEvent(msg)) {
          console.log(red(`Connection closed: code=${msg.code}, reason=${msg.reason}`));
        }
      }
    })(this.socket);
    
    const tpr = new TextProtoReader(new BufReader(Deno.stdin));
    while (true) {
      const line: any = await tpr.readLine();
      if (line === "close") {
        break;
      } else if (line === "ping") {
        await this.socket.ping();
      } else {
        await this.socket.send(line);
      }
    }
    await this.socket.close(1000);
    Deno.exit(0);
  }
}
