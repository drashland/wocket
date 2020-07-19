import { ITransmitterOptions } from "./interfaces.ts";
import { RESERVED_EVENT_NAMES } from "./reserved_event_names.ts";
import { SocketServer } from "./server.ts";
import { WebSocket } from "../deps.ts";

// TODO(sara) Add description
export class Transmitter {
  /**
   * See ITransmitterOptions
   */
  private ping_interval: number | undefined = 2000;

  /**
   * See ITransmitterOptions
   */
  private ping_timeout: number | undefined = 4000;

  /**
   * See ITransmitterOptions
   */
  private reconnect: boolean | undefined = true;

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
   * @param clientId - The WebSocket connection ID of the client in question.
   *
   * @returns A Promise
   */
  public async handleMessage(
    message: Uint8Array,
    client: Client,
  ): Promise<void> {
    let result = new TextDecoder().decode(message);
    // deno-lint-ignore no-explicit-any
    let parsedMessage: any = {};
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
   * @param clientId - The WebSocket connection ID of the client in question.
   */
  public handleReservedEventNames(
    eventName: string,
    clientId: number,
    socket?: WebSocket | undefined,
  ): void {
    switch (eventName) {
      case "connection":
      case "disconnect":
        if (this.socket_server.channels[eventName]) {
          this.socket_server.channels[eventName].callbacks.forEach(
            (cb: Function) => {
              cb(clientId);
            },
          );
        }
        break;
      case "error":
        // do something when client errors
        break;
      case "listen_to":
        this.socket_server.addListener("listening_to", clientId);
        break;
      case "pong":
        if (!this.socket_server.clients[clientId]) {
          if (socket) {
            this.socket_server.addClient(clientId, socket);
            this.hydrateClient(clientId);
          }
        } else {
          this.socket_server.clients[clientId].pong_received = true;
        }
        break;
      case "reconnect":
        // do something on an reconnect event
        // could be useful to add a flag to this client
        break;
      default:
        this.socket_server.addListener(eventName, clientId);
        break;
    }
  }

  /**
   * Hydrate the client with properties.
   *
   * @param clientId - The WebSocket connection ID of the client in question.
   */
  public hydrateClient(clientId: number): void {
    if (this.reconnect) {
      this.socket_server.clients[clientId].pong_received = true;
      this.socket_server.clients[clientId].heartbeat_id = this.startHeartbeat(
        clientId,
      );
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PRIVATE ///////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Pings client at a set interval.
   *
   * @param clientId - The WebSocket connection ID of the client in question.
   */
  private ping(clientId: number): void {
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

  /**
   * Start a heartbeat for the client in question.
   *
   * @param clientId - The WebSocket connection ID of the client in question.
   *
   * @returns The heartbeat ID. This is used to clear a heartbeat in
   * timeoutPing().
   */
  private startHeartbeat(clientId: number): number {
    let id = setInterval(() => this.ping(clientId), this.ping_interval);
    return id;
  }

  /**
   * Pings client at a timeout. If client does not respond, client connection
   * will be removed.
   *
   * @param clientId - The WebSocket connection ID of the client in question.
   */
  private timeoutPing(clientId: number): void {
    if (this.socket_server.clients[clientId]) {
      this.socket_server.removeClient(clientId);
      const heartbeatId = this.socket_server.clients[clientId].heartbeat_id;
      if (heartbeatId) {
        clearInterval(heartbeatId);
      }
    }
  }
}
