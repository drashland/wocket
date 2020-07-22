import { Client } from "./client.ts";
import { ITransmitterOptions } from "./interfaces.ts";
import { RESERVED_EVENT_NAMES } from "./reserved_event_names.ts";
import { Server } from "./server.ts";
import { Packet } from "./packet.ts";

/**
 * The `Transmitter` class is used as the middleman between the client and
 * server, when sending messages, to connect the 'wires' between them.
 */
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
  private server: Server;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   *
   * @param server - The socket server requiring this transmitter.
   * @param options - See ITransmitterOptions.
   */
  constructor(server: Server, options?: ITransmitterOptions) {
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

    this.server = server;
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Decodes and validates incoming messages.
   *
   * @param packet - See Packet.
   */
  public async handlePacket(packet: Packet): Promise<void> {
    if (RESERVED_EVENT_NAMES.includes(packet.to)) {
      return this.handleReservedEvent(packet);
    }

    // Invoke all callbacks (aka the handlers for this packet)
    if (this.server.channels[packet.to]) {
      for await (let cb of this.server.channels[packet.to].callbacks) {
        cb(packet);
      }
      return;
    }

    throw new Error(`Channel "${packet.to}" not found.`);
  }

  /**
   * Handles connection states, and actions based on those states.
   *
   * @param packet - See Packet.
   */
  public handleReservedEvent(packet: Packet): void {
    const eventName = packet.to;
    switch (eventName) {
      case "connection":
      case "disconnect":
        if (this.server.channels[eventName]) {
          this.server.channels[eventName].callbacks.forEach(
            (cb: Function) => {
              cb(packet);
            },
          );
        }
        break;

      case "error":
        if (packet.from instanceof Client) {
          packet.from.socket.send("An error occurred with the connection.");
        }
        break;

      case "pong":
        if (!this.server.clients[packet.from.id as number]) {
          if (packet.from instanceof Client) {
            if (packet.from.socket) {
              this.server.createClient(packet.from.id, packet.from.socket);
              this.hydrateClient(packet.from.id);
            }
          }
        } else {
          if (packet.from instanceof Client) {
            this.server.clients[packet.from.id].pong_received = true;
          }
        }
        break;

      case "reconnect":
        // do something on an reconnect event
        // could be useful to add a flag to this client
        break;

      default:
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
      this.server.clients[clientId].pong_received = true;
      this.server.clients[clientId].heartbeat_id = this.startHeartbeat(
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
    if (this.server.clients[clientId]) {
      const client = this.server.clients[clientId];
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
    if (this.server.clients[clientId]) {
      this.server.removeClient(clientId);
      const heartbeatId = this.server.clients[clientId].heartbeat_id;
      if (heartbeatId) {
        clearInterval(heartbeatId);
      }
    }
  }
}
