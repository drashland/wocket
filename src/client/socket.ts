import { append } from "../../deps.ts";
import { MESSAGE_TYPE } from "../lib/io_types.ts";

export default class Socket {
  protected socket: any;
  protected listening: any;
  protected messageQueue: any;
  protected ready: any;

  constructor(socket: any) {
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
