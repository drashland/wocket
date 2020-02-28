export default class Sender {
  private messageQueue: any;
  private ready: boolean;

  constructor() {
    this.messageQueue = [];
    this.ready = true;
  }

  public add(message: any) {
    this.messageQueue.push(message);
    this.send();
  }

  public async invokeCallback(msgObj: any): Promise<void> {
    const args = Array.prototype.slice.call(arguments);
    for await (let cb of msgObj.callbacks) {
      cb.apply(this, args);
    }
  }

  private async send() {
    if (this.ready && this.messageQueue.length) {
      this.ready = false;
      const messageObj = this.messageQueue.shift();
      const {
        type,
        message,
        from,
        listeners
      } = messageObj;
      console.log(message);

      const encodedMessage = new TextEncoder().encode(JSON.stringify({ [type]: message }));
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
