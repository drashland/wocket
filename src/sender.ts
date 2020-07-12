import { PackageQueueItem } from "./package_queue_item.ts";
import { ICallback } from "./interfaces.ts";

// TODO(sara) Add description
export class Sender {
  private package_queue: PackageQueueItem[] = [];
  private ready: boolean = true;

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
  public add(packageQueueItem: PackageQueueItem) {
    this.package_queue.push(packageQueueItem);
    this.send();
  }

  /**
   * Invokes event callbacks.
   *
   * @param msgObj
   */
  public async invokeCallback(msgObj: ICallback): Promise<void> {
    const args = Array.prototype.slice.call(arguments);
    for await (let cb of msgObj.callbacks) {
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
  private async send() {
    if (this.ready && this.package_queue.length) {
      this.ready = false;
      const pkgQueueItem = this.package_queue.shift();
      const encodedMessage = new TextEncoder().encode(
        JSON.stringify(
          { [pkgQueueItem!.channel.name]: pkgQueueItem!.package.message },
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
