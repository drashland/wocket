// import { Transmitter } from "./transmitter.ts";
import { Client } from "./client.ts";
import { Channel } from "./channel.ts";
import { WebSocket } from "../deps.ts";
import { Packet } from "./packet.ts";
import { RESERVED_EVENT_NAMES } from "./reserved_event_names.ts";

/**
 * The EventEmitter class is responsible for the logic of sending and receiving
 * messages. To do this, it aggregates information on clients, such as tracking
 * how many clients are connected and what channels are open.
 */
export class EventEmitter {
  /**
   * A queue of packets.
   */
  protected packet_queue: Packet[] = [];

  /**
   * Tells `Sender` when it is ready to work through the packet queue. For
   * instance, whilst sending a packet, `ready` is `false` and once the packet
   * is sent, the class is ready to send another packet.
   */
  protected ready = true;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   */
  constructor() {
    // this.transmitter = new Transmitter();
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Broadcasts a message to all receivers of a channel.
   */
  public broadcast(packet: Packet): void {
    this.to(packet);
  }

  /**
   * Does this sender have packets that still need to be sent?
   *
   * @returns True if yes, false if not.
   */
  public hasPackets(): boolean {
    return this.packet_queue.length > 0;
  }

  /**
   * Send a message to a channel, excluding the sender.
   *
   * @param channelName - The name of the channel.
   * @param message - The message to send.
   * @param clientToSendTo - Optional. If you wish to send the event to a specific client, specify the client id
   */
  public to(packet: Packet): void {
    // Queue the packet
    this.packet_queue.push(packet);

    // Fkn send it!
    // this.transmitter.send();
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PROTECTED /////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Encodes messages and sends event to all clients listening to the channel or
   * event except for the sender.
   */
  protected async send(): Promise<void> {
    if (this.ready && this.hasPackets()) {
      this.ready = false;
      try {
        const packet = this.packet_queue.shift()!;

        if (packet.receiver instanceof Channel) {
          return this.sendToChannel(packet);
        }

        if (packet.receiver instanceof Client) {
          // return this.sendToClient(packet);
        }

      } catch (_error) {
        // Do nothing bruv. The most likey cause for an error is calling the
        // .shift() on the packet queue. If no messages exist in the packet
        // queue, then whatever. We do not care.
      }
      this.ready = true;
      this.send();
    }
  }

  protected async sendToChannel(packet: Packet): Promise<void> {
    for await (const packet of this.packet_queue) {
      // Don't send to sender
      // Don't send it to clients other than the receiver
      // try {
      //   // Serialize the message
      //   const message = JSON.stringify({
      //     sender: queueItem.packet.sender instanceof EventEmitter
      //       ? "Server"
      //       : queueItem.packet.sender.id.toString(),
      //     receiver: queueItem.packet.receiver,
      //     message: queueItem.packet.message,
      //   });
      //   // Send the message
      //   await socketConn.send(message);
      // } catch (err) {
      //   console.log(`Unable to send message to Client #${clientId}.`);
      // }
    }
  }
}
