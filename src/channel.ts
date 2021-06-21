import { WebSocket } from "../deps.ts";
import { Client } from "./client.ts";
import { EventEmitter } from "./event_emitter.ts";

/**
 * Channel represents channels, also known as "rooms". This class describes open
 * channels, and is used to place clients into
 */
export class Channel extends EventEmitter {
  /**
   * The callbacks for listening
   *
   *     function handleChannel1 (...) { ... }
   *     socketServer.on("channel 1", handleChannel1)
   *
   * `handleChannel1` is now registered as a callback.
   */
  public callbacks: ((event: CustomEvent) => void)[] = [];

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
    super(`wocket_channel_${name}`);
    this.addEventListener(this.name, (e: Event) => {
      this.callbacks.forEach((callback: (ce: CustomEvent) => void) => {
        callback((e as CustomEvent).detail);
      })
    });
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - PUBLIC //////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  public disconnectClient(client: Client): void {
    const clientInThisChannel = this.clients.get(client.id);

    if (!clientInThisChannel) {
      throw new Error(
        "You cannot be disconnected from a channel you are not conneted to."
      );
    }

    this.clients.delete(client.id);
  }

  public executeCallbacks(event: CustomEvent): void {
    this.callbacks.forEach(
      async (cb: (event: CustomEvent) => void) => {
        await cb(event);
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

  public handleEvent(sender: Client, message: unknown): boolean {
    // Make sure we send the sender's ID in the message
    const hydratedMessage = message as { sender: number };
    hydratedMessage.sender = sender.id;

    const event = new CustomEvent(this.name, {
      detail: hydratedMessage
    });

    return this.dispatchEvent(event);
  }
}
