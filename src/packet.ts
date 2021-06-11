import { Client } from "./client.ts";
import { Channel } from "./channel.ts";
import { Server } from "./server.ts";
import { EventEmitter } from "./event_emitter.ts";

// TODO(sara) Add description
export class Packet {
  /**
   * A property to hold the sender.
   */
  sender: Channel | Client;

  /**
   * A property to hold the message this packet contains.
   */
  message?: unknown;

  /**
   * A property to hold the receiver of this packet.
   */
  receiver: Channel | Client;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   */
  constructor(
    sender: Channel | Client,
    receiver: Channel | Client,
    message?: unknown,
  ) {
    this.sender = sender;
    this.receiver = receiver;
    if (message) {
      this.message = message;
    }
  }

  // public toEntity(): string {
  //   return JSON.stringify({
  //     sender: this.getSender(),
  //     receiver: this.getReceiver(),
  //     message: this.message,
  //   });
  // }
}
