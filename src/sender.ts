import { Packet } from "./packet.ts";
import { Channel } from "./channel.ts";
import { EventEmitter } from "./event_emitter.ts";

/**
 * The Sender class is responsible for adding messages to the message queue, and
 * then to work through the queue stack which will send the message.
 */
export class Sender {
  /**
   * A queue of packets.
   */
  private packet_queue: Array<{ packet: Packet; channel: Channel }> = [];

  /**
   * Tells `Sender` when it is ready to work through the packet queue. For
   * instance, whilst sending a packet, `ready` is `false` and once the packet
   * is sent, the class is ready to send another packet.
   */
  private ready = true;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Adds a new message to the message queue to be sent.
   *
   * @param packet - The item to store in the queue. This item will be sent in
   * the order it was received as long as the queue is in a "ready" state. Being
   * "ready" means that the queue is not currently sending any messages.
   * Messages are not sent concurrently.
   * @param channel - The channel instance this packet is going to.
   */
  public add(packet: Packet, channel: Channel) {
    this.packet_queue.push({ packet, channel });
    this.send();
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PRIVATE ///////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Encodes messages and sends event to all clients listening to the channel or
   * event except for the sender.
   */
  private async send() {
    if (this.ready && this.packet_queue.length) {
      this.ready = false;
      const queueItem = this.packet_queue.shift();
      if (queueItem) {
        for await (let listener of queueItem.channel.listeners) {
          const [clientId, socketConn] = listener;
          if (clientId !== queueItem.packet.from.id) {
            try {
              // Serialize the message
              const message = JSON.stringify({
                from: queueItem.packet.from instanceof EventEmitter
                  ? "Server"
                  : queueItem.packet.from.id.toString(),
                to: queueItem.packet.to,
                message: queueItem.packet.message,
              });
              // Send the message
              await socketConn.send(message);
            } catch (err) {
              console.log(`Unable to send message to Client #${clientId}.`);
            }
          }
        }
        this.ready = true;
        this.send();
      }
    }
  }
}
