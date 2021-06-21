import { WebSocket } from "../deps.ts";
import { Channel } from "./channel.ts";
import { EventEmitter } from "./event_emitter.ts";
import { IIncomingEvent } from "./interfaces.ts";

/**
 * The Client class represents a single end-user client.  It contains
 * information about their id, their web socket connection, and many more.
 */
export class Client extends EventEmitter {
  /**
   * The clients id, which is the id of the socket connection sent across.
   *
   *     const clientId = conn.rid;
   */
  public id: number;

  /**
   * A list of channels the client is listening to.
   */
  public channels: Map<string, Channel> = new Map();

  /**
   * This client's WebSocket instance.
   */
  public socket: WebSocket;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   *
   * @param id - The client's ID.
   * @param socket - The socket this client belongs to.
   */
  constructor(id: number, socket: WebSocket) {
    super(`wocket_client_${id}`);
    this.id = id;
    this.socket = socket;
    this.addEventListener(this.name, (e: Event) => {
      this.socket.send(JSON.stringify((e as CustomEvent).detail));
    });
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - PUBLIC //////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  public listenToChannel(channel: Channel): void {
    this.channels.set(channel.name, channel);
  }

  public disconnectFromAllChannels(): void {
    this.channels.forEach((channel: Channel) => {
      channel.disconnectClient(this);
    });
  }

  public handleMessage(sender: Client, message: unknown): boolean {
    // Make sure we send the sender's ID in the message
    const hydratedMessage = message as { sender: number };
    hydratedMessage.sender = sender.id;

    const event = new CustomEvent(this.name, {
      detail: hydratedMessage
    });

    return this.dispatchEvent(event);
  }
}
