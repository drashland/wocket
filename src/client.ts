import { WebSocket } from "../deps.ts";
import { Channel } from "./channel.ts";

/**
 * The Client class represents a single end-user client.  It contains
 * information about their id, their web socket connection, and many more.
 */
export class Client {
  /**
   * The `heartbeat_id` is the  same as the `id`. It is used to 'poll' the
   * client, to check if the connection is alive.
   */
  public heartbeat_id: number | null = null;

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
   * How we know that the client connection is ready for a message.
   */
  public pong_received = false;

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
    this.id = id;
    this.socket = socket;
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
}
