import { WebSocket } from "../deps.ts";
import { Client } from "./client.ts";
import { EventEmitter } from "./event_emitter.ts";

/**
 * This class represents channels, also known as "rooms" to some, and is
 * responsible for the following:
 *
 *     - Connecting clients
 *     - Disconnecting clients
 */
export class Channel extends EventEmitter {
  /**
   * An array of callbacks to execute when a client connects to this channel.
   */
  public callbacks: ((event: CustomEvent) => void)[] = [];

  /**
   * See Server.clients. However, Server.clients contains all clients connected
   * to the server. This only contains clients connected to this channel.
   */
  public clients: Map<number, Client> = new Map();

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   *
   * @param name - The name of this channel.
   */
  constructor(name: string) {
    super(`wocket_channel:${name}`);
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - PUBLIC //////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Close this channel.
   */
  public close(): void {
    this.clients.forEach((client: Client) => {
      client.socket.send(`${this.name} closed.`);
    });
  }

  /**
   * Connect a clilent to this channel.
   *
   * @param client - See Client.
   */
  public connectClient(client: Client): void {
    this.clients.set(client.id, client);
  }

  /**
   * Disconnect the specified client.
   *
   * @param client - See Client.
   */
  public disconnectClient(client: Client): boolean {
    return this.clients.delete(client.id);
  }

  /**
   * Execute callbacks in the this.callbacks array.
   *
   * @param event - See https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent.
   */
  public executeCallbacks(event: CustomEvent): void {
    this.callbacks.forEach(
      async (cb: (event: CustomEvent) => void) => {
        await cb(event);
      },
    );
  }

  /**
   * Does this channel have the specified client? That is, the client is
   * connected to this channel.
   *
   * @param client - See Client.
   *
   * @returns True if yes, false if not.
   */
  public hasClient(client: Client): boolean {
    return this.clients.get(client.id) ? true : false;
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - PROTECTED ///////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * See EventEmitter.eventHandler().
   */
  protected eventHandler(event: Event): void {
    this.callbacks.forEach((callback: (customEvent: CustomEvent) => void) => {
      callback((event as CustomEvent).detail);
    });
  }
}
