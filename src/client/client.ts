import {
  connectWebSocket,
  append
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
        console.log(msg);
      } else if (msg instanceof Uint8Array) {
        this.receiveEncodedMessage(msg);
      }
    }
  }

  private receiveEncodedMessage(encodedMessage: any) {
    const decodedMessage = new TextDecoder().decode(encodedMessage);
    const parsedMessage = JSON.parse(decodedMessage);
    Object.keys(parsedMessage).forEach((type) => {
      if (this.listening[type]) this.listening[type](parsedMessage[type]);
    })
  }

  public on(type: string, cb: any) {
    if (!this.listening[type]) this.listening[type] = null;
    this.listening[type] = cb;
    const toSend = JSON.stringify({ eventType: type });
    const encoded = new TextEncoder().encode(toSend);
    this.messageQueue.push(encoded);
    return this.emit();
  }

  public send(type: string, message: string) {
    const toSend = JSON.stringify({ [type]: message });
    const encoded = new TextEncoder().encode(toSend);
    this.messageQueue.push(encoded);
    return this.emit();
  }

  private async emit() {
    if (this.ready && this.messageQueue.length) {
      this.ready = false;
      let toSend = new Uint8Array(0);;
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

  public async attach() {
    const socketConnection = await connectWebSocket("ws://127.0.0.1:3000");
    this.socket = new Socket(socketConnection);
    return this.socket;
  }
}
