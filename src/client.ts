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
    this.addEventListener(this.name, (event: Event) => {
      console.log(event);
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

  public handleMessage(client: Client, message: IIncomingEvent): boolean {
    const event = new CustomEvent(this.name, {
      detail: {
        sender: client,
        receiver: this,
        message: message,
      }
    });

    return this.dispatchEvent(event);
  }
}
