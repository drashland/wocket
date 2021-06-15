import { Client } from "./client.ts";
import { Channel } from "./channel.ts";
import { Server } from "./server.ts";
import { EventEmitter } from "./event_emitter.ts";

export class Packet {
  /**
   * A property to hold the sender.
   */
  sender: Client;

  /**
   * A property to hold the message this packet contains.
   */
  body?: unknown;

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
    sender: Client,
    receiver: Channel | Client,
    body?: unknown,
  ) {
    this.sender = sender;
    this.receiver = receiver;
    this.body = body ?? "";
  }

  public toJsonString(): string {
    return JSON.stringify({
      sender: this.getSenderNameOrId() as string,
      body: this.body,
    });
  }

  protected getSenderNameOrId(): number | string {
    if (this.sender instanceof Channel) {
      return this.sender.name;
    }

    if (this.sender instanceof Client) {
      return this.sender.id;
    }

    // This will probably never happen because the sender can only be of a
    // Client or Channel type.
    throw new Error(
      "Could not identify sender. Sender is not a Channel or a Client.",
    );
  }
}
