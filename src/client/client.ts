import { MESSAGE_TYPE } from "../lib/io_types.ts";
import {
  connectWebSocket,
  append,
  TextProtoReader,
  BufReader
} from "../../deps.ts";

class Socket {
  protected socket: any;
  protected listening: any;
  protected messageQueue: any;
  protected ready: any;

  constructor(socket) {
    this.socket = socket;
    this.listening = {};
    this.messageQueue = [];
    this.ready = true;
    this.init();
  }

  private async init() {
    for await (const msg of this.socket.receive()) {
      if (typeof msg === "string") {
      } else if (msg instanceof Uint8Array) {
        this.receiveEncodedMessage(msg);
      }
    }
  }

  private receiveEncodedMessage(encodedMessage: MESSAGE_TYPE) {
    const decodedMessage = new TextDecoder().decode(encodedMessage);
    const parsedMessage = JSON.parse(decodedMessage);
    Object.keys(parsedMessage).forEach((type) => {
      if (this.listening[type]) this.listening[type](parsedMessage[type]);
    })
  }

  public on(type: string, cb: Function) {
    if (!this.listening[type]) this.listening[type] = null;
    this.listening[type] = cb;
    const toSend = JSON.stringify({ listeningTo: type });
    const encoded = new TextEncoder().encode(toSend);
    this.messageQueue.push(encoded);
    this.emit();
  }

  public send(type: string, message: string) {
    let toSend = null;
    if (type) {
      const preparedString = JSON.stringify({ [type]: message });
      toSend = new TextEncoder().encode(preparedString);
    } else {
      toSend = message;
    }
    this.messageQueue.push(toSend);
    this.emit();
  }

  private async emit() {
    if (this.ready && this.messageQueue.length) {
      this.ready = false;
      let toSend = new Uint8Array(0);
      while (this.messageQueue.length) {
        toSend = append(toSend, this.messageQueue.shift());
      }
      await this.socket.send(toSend);
      this.ready = true;
      this.emit();
    }
  }
}

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
