import { WebSocket } from "../deps.ts";
import { Channel } from "./channel.ts";
import { EventEmitter } from "./event_emitter.ts";

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
   * connects to the server). Use this to send events back to the client. For
   * example:
   *
   *     this.socket.send("something");
   */
  constructor(id: number, socket: WebSocket) {
    super(`wocket_client:${id}`);
    this.id = id;
    this.socket = socket;
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - PUBLIC //////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Connect to the specified channel.
   *
   * @param channel - See Channel.
   */
  public connectToChannel(channel: Channel): void {
    this.channels.set(channel.name, channel);
  }


  /**
   * Disconnect from all channels.
   */
  public disconnectFromAllChannels(): void {
    this.channels.forEach((channel: Channel) => {
      channel.disconnectClient(this);
      this.channels.delete(channel.name);
    });
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
