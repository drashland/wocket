// import { Transmitter } from "./transmitter.ts";
import { Server } from "./server.ts";
import { RESERVED_EVENT_NAMES } from "./reserved_event_names.ts";

/**
 * The EventEmitter class is responsible for the logic of sending and receiving
 * messages. To do this, it aggregates information on clients, such as tracking
 * how many clients are connected and what channels are open.
 */
export class EventEmitter extends EventTarget {
  /**
   * The name of this channel.
   */
  public name: string;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  constructor(name: string) {
    super();
    this.name = name;
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Broadcasts a message to all receivers of a channel.
   */
  public broadcast(event: Event): void {
    this.to(event);
  }

  /**
   * Send a message to a channel, excluding the sender.
   */
  public to(event: Event): void {
    console.log(event);
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PROTECTED /////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////
}
