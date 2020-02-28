import Socket from "./socket.ts";
import {
  connectWebSocket,
  TextProtoReader,
  BufReader
} from "../../deps.ts";

export default class SocketClient {
  public socket: any;
  private options: any;
  constructor(options: any = {}) {
    this.options = {
      address: options.address || "127.0.0.1",
      port: options.port || 3000,
    };
  }

  public getOptions() {
    return this.options;
  }

  public async attach() {
    const socketConnection = await connectWebSocket(`ws://${this.options.address}:${this.options.port}`);
    this.socket = new Socket(socketConnection);
    return this.socket;
  }

  public async initConsole(to: string) {
    const tpr = new TextProtoReader(new BufReader(Deno.stdin));
    while (true) {
      const line: any = await tpr.readLine();
      if (line === "close") {
        break;
      } else if (line === "ping") {
        await this.socket.ping();
      } else {
        await this.socket.send(to, line);
      }
    }
    await this.socket.close(1000);
    Deno.exit(0);
  }
}
