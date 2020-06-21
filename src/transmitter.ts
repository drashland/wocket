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
        this.handleReservedEventNames(parsedMessage[channelName], clientId);
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
  public handleReservedEventNames(eventName: string, clientId: number, socket?: any): void {
    switch (eventName) {
      case "connection":
      case "disconnect":
        if (this.server.channels[eventName]) {
          this.server.channels[eventName].callbacks.forEach((cb: Function) => {
            cb(clientId);
          });
        }
        break;
      case "reconnect":
          // do something on an reconnect event
          // could be useful to add a flag to this client
        break;
      case "pong":
        if (!this.server.clients[clientId]) {
          this.server.addClient(clientId, socket);
          this.start(clientId);
        } else {
          this.server.clients[clientId].pong_received = true;
        }
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
    this.server.clients[clientId].heartbeat = setInterval(() => this._ping(clientId), this.pingInterval);
  }

  private _timeoutPing(clientId: number) {
    if (this.server.clients[clientId]) {
      this.server.removeClient(clientId);
      clearInterval(this.server.clients[clientId].heartbeat);
    }
  }

  private _ping(clientId: number) {
    if (this.server.clients[clientId]) {
      const client = this.server.clients[clientId];
      if (client.pong_received) {
        client.socket.send('ping');
        client.pong_received = false;
      } else {
        setTimeout(() => this._timeoutPing(clientId), this.pingTimeout);
      }
    }
  }
}
