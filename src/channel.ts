import { WebSocket } from "../deps.ts";
import { Packet } from "./packet.ts";
import { Client } from "./client.ts";
import { Callback } from "./types.ts";

/**
 * Channel represents channels, also known as "rooms". This class describes open
 * channels, and is used to place clients into
 */
export class Channel {
  /**
   * The callbacks for listening
   *
   *     function handleChannel1 (...) { ... }
   *     socketServer.on("channel 1", handleChannel1)
   *
   * `handleChannel1` is now registered as a callback.
   */
  public callbacks: Callback[] = [];

  /**
   * The name of the channel to create
   *
   *     new Channel("channel 1");
   */
  public name: string;

  /**
   * Acts as the list of clients connected to the channel.  A listener would
   * contain the clients socket id and and the socket connection sent across
   *
   *     new Channel("channel 1").listeners.set(
   *       2, // clients socket id
   *       incomingSocketConnection
   *     })
   */
  public clients: Map<number, Client> = new Map();

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   *
   * @param name - The name of the channel.
   */
  constructor(name: string) {
    this.name = name;
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - PUBLIC //////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  public addCallback(cb: Callback): void {
    this.callbacks.push(cb);
  }

  public disconnectClient(client: Client): void {
    const clientInThisChannel = this.clients.get(client.id);

    if (!clientInThisChannel) {
      throw new Error("Cannot disconnect non-existent client from channel.");
    }

    this.clients.delete(client.id);
  }

  public executeCallbacks(): void {
    this.callbacks.forEach(
      async (cb: Callback) => {
        return cb();
      },
    );
  }

  public connectClient(client: Client): void {
    this.clients.set(client.id, client);
  }

  public close(): void {
    this.clients.forEach((client: Client) => {
      client.socket.send(`${this.name} closed.`);
    });
  }

  public hasClient(client: Client): boolean {
    return this.clients.get(client.id) ? true : false;
  }
}
