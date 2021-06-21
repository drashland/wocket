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
    super(`wocket_channel_${name}`);
    // Create the event listener so that events sent to this channel are handled
    // appropriately
    this.addEventListener(this.name, (e: Event) => {
      this.callbacks.forEach((callback: (ce: CustomEvent) => void) => {
        callback((e as CustomEvent).detail);
      })
    });
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

  public connectClient(client: Client): void {
    this.clients.set(client.id, client);
  }

  /**
   * Disconnect the specified client.
   *
   * @param client - See Client.
   */
  public disconnectClient(client: Client): void {
    const clientInThisChannel = this.clients.get(client.id);

    if (!clientInThisChannel) {
      throw new Error(
        "You cannot be disconnected from a channel you are not conneted to."
      );
    }

    this.clients.delete(client.id);
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

  /**
   * Handle an event passed to this channel.
   *
   * @param sender - See Client.
   * @param message - The message that is inside the event. Users can send
   * events to channels that contain complex messages of any type. We do not
   * know what they will pass in; therefore, the message is unknown.
   *
   * @returns True if the event was dispatched to this channels event listener,
   * false if not.
   */
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
