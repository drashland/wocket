import { WebSocket } from "../deps.ts";
import { Channel } from "./channel.ts";
import { EventEmitter } from "./event_emitter.ts";
import { IIncomingEvent } from "./interfaces.ts";

/**
 * This class represents a single end-user client. It contains information about
 * their connection ID (when they first connected to the server), their web
 * socket connection, and more.
 */
export class Client extends EventEmitter {
  /**
   * This client's ID, which is the ID of its socket connection when it
   * connected to the server. For example:
   *
   *     const clientId = conn.rid;
   */
  public id: number;

  /**
   * A list of channels this client is connected to.
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
   * @param id - The client's connection ID (given by the server when the client
   * connects to the server).
   * @param socket - The socket connection (given by the server when the client
   * connets to the server). Use this to send messages back to the client. For
   * example:
   *
   *     this.socket.send("something");
   */
  constructor(id: number, socket: WebSocket) {
    super(`wocket_client_${id}`);
    this.id = id;
    this.socket = socket;
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - PUBLIC //////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Disconnect from all channels.
   */
  public disconnectFromAllChannels(): void {
    this.channels.forEach((channel: Channel) => {
      channel.disconnectClient(this);
    });
  }

  /**
   * Handle an event passed to this client.
   *
   * @param sender - An instance of this class.
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
      detail: hydratedMessage,
    });

    return this.dispatchEvent(event);
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - PROTECTED ///////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * See EventEmitter.eventHandler().
   */
  protected eventHandler(event: Event): void {
    this.socket.send(JSON.stringify((event as CustomEvent).detail));
  }
}
