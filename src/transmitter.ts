import { MESSAGE_TYPE } from "./io_types.ts";
import { RESERVED_EVENT_NAMES } from "./reserved_event_names.ts";
import { SocketServer } from "./server.ts";

export interface ITransmitterOptions {
  /**
   * A property to determine number of ms to wait for a pong event before
   * closing a client connection.
   */
  ping_interval: number;

  /**
   * A property to determine number of ms before sending a ping event to a
   * connected client.
   */
  ping_timeout: number;

  /**
   * A property to set reconnect flag. If false, server will not ping client.
   */
  reconnect: boolean;
}

export class Transmitter {
  /**
   * See ITransmitterOptions
   */
  private ping_interval: number = 2000;

  /**
   * See ITransmitterOptions
   */
  private ping_timeout: number = 4000;

  /**
   * See ITransmitterOptions
   */
  private reconnect: boolean = true;

  /**
   * A property to hold the socket server.
   */
  private socket_server: SocketServer;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   *
   * @param socketServer - The socket server requiring this transmitter.
   * @param options = See ITransmitterOptions
   */
  constructor(socketServer: SocketServer, options?: ITransmitterOptions) {
    if (options) {
      if ("reconnect" in options) {
        this.reconnect = options.reconnect;
      }
      if (options.ping_interval) {
        this.ping_interval = options.ping_interval;
      }

      if (options.ping_timeout) {
        this.ping_timeout = options.ping_timeout;
      }
    }

    this.socket_server = socketServer;
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Decodes and validates incoming messages.
   *
   * @param message - Uint8Array
   * @param clientId - Client's socket connection id.
   *
   * @returns A Promise
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
      } else if (this.socket_server.channels[channelName]) {
        await this.socket_server.sender.invokeCallback({
          ...this.socket_server.channels[channelName],
          channelName,
          message: parsedMessage[channelName],
          from: clientId,
        });
      }
    }
  }

  /**
   * @param eventName
   * @param clientId
   */
  public handleReservedEventNames(
    eventName: string,
    clientId: number,
    socket?: any,
  ): void {
    switch (eventName) {
      case "connection":
      case "disconnect":
        if (this.socket_server.channels[eventName]) {
          this.socket_server.channels[eventName].callbacks.forEach((cb: Function) => {
            cb(clientId);
          });
        }
        break;
      case "reconnect":
        // do something on an reconnect event
        // could be useful to add a flag to this client
        break;
      case "pong":
        if (!this.socket_server.clients[clientId]) {
          this.socket_server.addClient(clientId, socket);
          this.hydrateClient(clientId);
        } else {
          this.socket_server.clients[clientId].pong_received = true;
        }
        break;
      case "error":
        // do something when client errors
        break;
      default:
        this.socket_server.addListener(eventName, clientId);
        break;
    }
  }

  /**
   * Hydrate the client with properties.
   *
   * @param clientId - The client in question. We identify clients by an ID.
   */
  public hydrateClient(clientId: number) {
    if (this.reconnect) {
      this.socket_server.clients[clientId].pong_received = true;
      this.socket_server.clients[clientId].heartbeat = this.startHeartbeat(clientId);
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PRIVATE ///////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  private startHeartbeat(clientId: number) {
    setInterval(() => this.ping(clientId), this.ping_interval);
  }

  /**
   * Pings client at a timeout. If client does not respond, client connection
   * will be removed.
   *
   * @param clientId
   */
  private timeoutPing(clientId: number) {
    if (this.socket_server.clients[clientId]) {
      this.socket_server.removeClient(clientId);
      clearInterval(this.socket_server.clients[clientId].heartbeat);
    }
  }

  /**
   * Pings client at a set interval.
   *
   * @param clientId
   */
  private ping(clientId: number) {
    if (this.socket_server.clients[clientId]) {
      const client = this.socket_server.clients[clientId];
      if (client.pong_received) {
        client.socket.send("ping");
        client.pong_received = false;
      } else {
        setTimeout(() => this.timeoutPing(clientId), this.ping_timeout);
      }
    }
  }
}
