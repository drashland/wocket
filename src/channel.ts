import { WebSocket } from "../deps.ts";

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
  public callbacks: Function[] = [];

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
  public listeners: Map<number, WebSocket>;

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
    this.listeners = new Map();
  }
}
