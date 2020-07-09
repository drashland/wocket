// TODO(sara) Add description
export class Sender {
  private package_queue: any;
  private ready: boolean;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRCUTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   */
  constructor() {
    this.package_queue = [];
    this.ready = true;
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Adds a new message to the message queue to be sent.
   *
   * @param pkg
   */
  public add(pkg: any) {
    this.package_queue.push(pkg);
    this.send();
  }

  /**
   * Invokes event callbacks.
   *
   * @param msgObj
   */
  public async invokeCallback(msgObj: any): Promise<void> {
    const args = Array.prototype.slice.call(arguments);
    for await (let cb of msgObj.callbacks) {
      cb.apply(this, args);
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PRIVATE ///////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Encodes messages and sends event to all clients listening to the event
   * except for the sender.
   */
  private async send() {
    if (this.ready && this.package_queue.length) {
      this.ready = false;
      const pkgQueueItem = this.package_queue.shift();
      const encodedMessage = new TextEncoder().encode(
        JSON.stringify(
          { [pkgQueueItem.channel.name]: pkgQueueItem.package.message },
        ),
      );
      for await (let listener of pkgQueueItem.channel.listeners) {
        const [clientId, socketConn] = listener;
        if (clientId !== pkgQueueItem.package.sender_id) {
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
