import { MESSAGE_TYPE } from "./io_types.ts";
import { RESERVED_EVENT_NAMES } from "./reserved_event_names.ts";

export default class Transmitter {
  public deno_server: any;
  private pingInterval: number;
  private pingTimeout: number;
  private server: any;

  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////

  constructor(server: any) {
    this.pingInterval = server.pingInterval;
    this.pingTimeout = server.pingTimeout;
    this.server = server;
  }

    /**
   * @description
   *    Decodes and validates incoming messages.
   * 
   * @param MESSAGE_TYPE message
   *     Uint8Array
   * @param number clientId
   *     Client's socket connection id.
   * 
   * @return Promise<void>
   */
  public async checkEvent(
    message: MESSAGE_TYPE,
    clientId: number,
  ): Promise<void> {
    let result = new TextDecoder().decode(message);
    let parsedMessage = <any> {};
    try {
      parsedMessage = JSON.parse(result);
    } catch (err) {
      throw new Error(err);
    }

    for await (let channelName of Object.keys(parsedMessage)) {
      if (RESERVED_EVENT_NAMES.includes(channelName)) {
        this._handleReservedEventNames(parsedMessage[channelName], clientId);
      } else if (this.server.channels[channelName]) {
        await this.server.sender.invokeCallback({
          ...this.server.channels[channelName],
          channelName,
          message: parsedMessage[channelName],
          from: clientId,
        });
      }
    }
  }

    /**
   * @param string eventName
   * @param number clientId
   *
   * @return void
   */
  private _handleReservedEventNames(eventName: string, clientId: number): void {
    switch (eventName) {
      case "connection":
      case "disconnect":
        if (this.server.channels[eventName]) {
          this.server.channels[eventName].callbacks.forEach((cb: Function) => {
            cb(clientId);
          });
        }
        break;
      case "pong":
        this.server.clients[clientId].pong_received = true;
        break;
      case "error":
        // do something when client errors
      break;
      default:
        this.server.addListener(eventName, clientId);
        break;
    }
  }

  public start(clientId: number) {
    this.server.clients[clientId].pong_received = true;
    setInterval(() => {
      this._ping(clientId)
    }, this.pingInterval);
  }

  private _ping(clientId: number) {
    if (this.server.clients[clientId]) {
      const client = this.server.clients[clientId];
      if (client.pong_received) {
        client.socket.send('ping');
        client.pong_received = false;
      } else {
        setTimeout(() => this._ping(clientId), this.pingTimeout);
      }
    }
  }
}
