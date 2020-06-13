export default class Sender {
  private messageQueue: any;
  private ready: boolean;

  constructor() {
    this.messageQueue = [];
    this.ready = true;
  }

  /**
   * @description
   *     Adds a new message to the message queue to be sent.
   * 
   * @param message any
   * 
   * @return void
   */
  public add(message: any) {
    this.messageQueue.push(message);
    this.send();
  }

  /**
   * @description
   *     Invokes event callbacks.
   * 
   * @param msgObj any
   * 
   * @return void
   */
  public async invokeCallback(msgObj: any): Promise<void> {
    const args = Array.prototype.slice.call(arguments);
    for await (let cb of msgObj.callbacks) {
      cb.apply(this, args);
    }
  }

  /**
   * @description
   *     Encodes messages and sends event to all clients listening
   *     to the event except for the sender.
   */
  private async send() {
    if (this.ready && this.messageQueue.length) {
      this.ready = false;
      const messageObj = this.messageQueue.shift();
      const {
        eventName,
        message,
        from,
        listeners,
      } = messageObj;

      const encodedMessage = new TextEncoder().encode(
        JSON.stringify({ [eventName]: message }),
      );
      for await (let listener of listeners) {
        const [clientId, socketConn] = listener;
        if (clientId !== from) {
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
