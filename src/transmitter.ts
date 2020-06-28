import { MESSAGE_TYPE } from "./io_types.ts";
import { RESERVED_EVENT_NAMES } from "./reserved_event_names.ts";

export default class Transmitter {
  /**
   * @description
   *     A property to determine number of ms to wait for a pong event before closing a client connection.
   * @property ping interval
   */
  private pingInterval: number = 2000;

  /**
   * @description
   *     A property to determine number of ms before sending a ping event to a connected client.
   * @property ping timeout
   */
  private pingTimeout: number = 4000;

  /**
   * @description
   *     A property to set reconnect flag. If false, server will not ping client.
   * @property reconnect
   */
  private reconnect: boolean = true;
  private server: any;

  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////

  constructor(server: any, options: any = {}) {
    if ("reconnect" in options) {
      this.reconnect = options.reconnect;
    }

    if (options.pingInterval) {
      this.pingInterval = options.pingInterval;
    }

    if (options.pingTimeout) {
      this.pingTimeout = options.pingTimeout;
    }

    this.server = server;
    return this;
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
  public handleReservedEventNames(
    eventName: string,
    clientId: number,
    socket?: any,
  ): void {
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

  private _startHeartbeat(clientId: number) {
    setInterval(() => this._ping(clientId), this.pingInterval);
  }

  /**
   * @description
   *    Attaches heartbeat status to client object.
   * @param number clientId
   *
   * @return void
   */
  public start(clientId: number) {
    if (this.reconnect) {
      this.server.clients[clientId].pong_received = true;
      this.server.clients[clientId].heartbeat = this._startHeartbeat(clientId);
    }
  }

  /**
   * @description
   *    Pings client at a timeout. If client does not respond, client connection
   *    will be removed.
   * @param number clientId
   *
   * @return void
   */
  private _timeoutPing(clientId: number) {
    if (this.server.clients[clientId]) {
      this.server.removeClient(clientId);
      clearInterval(this.server.clients[clientId].heartbeat);
    }
  }

  /**
   * @description
   *    Pings client at a set interval.
   * @param number clientId
   *
   * @return void
   */
  private _ping(clientId: number) {
    if (this.server.clients[clientId]) {
      const client = this.server.clients[clientId];
      if (client.pong_received) {
        client.socket.send("ping");
        client.pong_received = false;
      } else {
        setTimeout(() => this._timeoutPing(clientId), this.pingTimeout);
      }
    }
  }
}
