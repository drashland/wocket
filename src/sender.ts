import { PackageQueueItem } from "./package_queue_item.ts";
import { IPacket } from "./interfaces.ts";

/**
 * The Sender class is responsible for adding
 * messages to the message queue, and then to work
 * through the queue stack which will send the message
 */
export class Sender {
  /**
   * A list of `PackageQueue` items which represents.
   * the message queue
   */
  private package_queue: PackageQueueItem[] = [];

  /**
   * Tells `Sender` when it is ready to work through
   * the package queue. For instance, whilst sending
   * a package, `ready` is `false` and once the package
   * is sent, the class is ready to send another package
   */
  private ready = true;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Adds a new message to the message queue to be sent.
   *
   * @param packageQueueItem - The item to store in the queue. This item will be
   * sent in the order it was received as long as the queue is in a "ready"
   * state. Being "ready" means that the queue is not currently sending any
   * messages. Messages are not sent concurrently.
   */
  public add(packageQueueItem: PackageQueueItem): void {
    this.package_queue.push(packageQueueItem);
    this.send();
  }

  /**
   * Invokes event callbacks.
   *
   * @param packet - The data object to invoke the callbacks on
   */
  public async invokeCallback(packet: IPacket): Promise<void> {
    const args = Array.prototype.slice.call(arguments);
    for await (let cb of packet.callbacks) {
      cb.apply(this, args);
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PRIVATE ///////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Encodes messages and sends event to all clients listening to the channel or
   * event except for the sender.
   */
  private async send(): Promise<void> {
    if (this.ready && this.package_queue.length) {
      this.ready = false;
      const pkgQueueItem = this.package_queue.shift();
      const encodedMessage = new TextEncoder().encode(
        JSON.stringify(
          {
            from: pkgQueueItem!.package.sender_id ?? "Server",
            to: pkgQueueItem!.channel.name,
            message: pkgQueueItem!.package.message,
          },
        ),
      );
      for await (let listener of pkgQueueItem!.channel.listeners) {
        const [clientId, socketConn] = listener;
        if (clientId !== pkgQueueItem!.package.sender_id) {
          try {
            await socketConn.send(encodedMessage);
          } catch (err) {
            console.log(`Unable to send to client: ${clientId}`);
          }
        }
      }
      this.ready = true;
      this.send();
    }
  }
}
