import { Client } from "./client.ts";
import { EventEmitter } from "./event_emitter.ts";

// TODO(sara) Add description
export class Packet {
  /**
   * A property to hold the sender.
   */
  from: Client | EventEmitter;

  /**
   * A property to hold the message this packet contains.
   */
  message?: unknown;

  /**
   * A property to hold the address this packet is going to.
   */
  to: string;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRCUTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   */
  constructor(
    from: Client | EventEmitter,
    to: string,
    message?: unknown,
  ) {
    this.from = from;
    this.to = to;
    if (message) {
      this.message = message;
    }
  }
}
