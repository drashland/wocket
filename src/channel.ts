import { WebSocket } from "../deps.ts";
import { Packet } from "./packet.ts";
import { Client } from "./client.ts";
import { Callback } from "./types.ts";
import { EventEmitter } from "./event_emitter.ts";
import { IIncomingMessage } from "./interfaces.ts";

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
  public callbacks: Callback[] = [];

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
    this.addEventListener(this.name, (event: Event) => {
      console.log(event);
      // this.emit(event);
    });
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

  public executeCallbacks(event: CustomEvent): void {
    this.callbacks.forEach(
      async (cb: Callback) => {
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

  public emit(event: Event): void {
    if (event instanceof CustomEvent) {
      const packet = event.detail;
      this.clients.forEach((client: Client) => {
        client.socket.send(packet.toJsonString());
      });
    }
  }

  public handleMessage(client: Client, message: IIncomingMessage): boolean {
    const event = new CustomEvent(this.name, {
      detail: new Packet(
        client,
        this,
        message.body,
      ),
    });

    return this.dispatchEvent(event);
  }
}
