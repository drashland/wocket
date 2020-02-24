class Sender {
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

  public async send() {
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
        if (listener.conn.rid !== from) listener.send(encodedMessage);
      }
      this.ready = true;
      this.send();
    }
  }
}

export default class EventEmitter {
  private events: any;
  private clients: any;
  private sender: any;

  constructor() {
    this.events = {};
    this.clients = {};
    this.sender = new Sender();
  }

  private addEvent(type: string, cb: any) {
    if (!this.events[type]) {
      this.events[type] = { listeners: [], callbacks: [] };
    }

    this.events[type].callbacks.push(cb);
  }

  private addListener(type: string, clientId: any) {
    if (!this.events[type]) {
      this.events[type] = { listeners: [], callbacks: [] };
    }
    if (!this.events[type].listeners.includes(this.clients[clientId])) {
      this.events[type].listeners.push(this.clients[clientId]);
    }
    return true;
  }

  public addClient(socket, clientId) {
    this.clients[clientId] = socket;
  }

  public removeClient(clientId) {
    delete this.clients[clientId];
    // todo: remove reference in this.events[event].listeners
  }

  public on(type: string, cb: any) {
    this.addEvent(type, cb);
  }

  public async to(type: string, message: any) {
    this.sender.add({
      ...this.events[type],
      type,
      message: typeof message === 'string' ? message : message.message,
      from: typeof message === 'string' ? undefined : message.from,
    });
  }

  private async _addToMessageQueue(type: string, message: string) {
    const msg = {
      ...this.events[type],
      type,
      message,
    };
    this.sender.add(msg);
  }

  public async checkEvent(message: any, clientId: any) {
    let result = new TextDecoder().decode(message);
    let parseMessage = {};
    try {
      parseMessage = JSON.parse(result);
    } catch(err) {
      throw new Error(err);
    }

    for await (let type of Object.keys(parseMessage)) {
      if (type === 'eventType') {
        this.addListener(parseMessage[type], clientId);
      } else if (this.events[type]) {
        await this.sender.invokeCallback({
          ...this.events[type],
          type,
          message: parseMessage[type],
          from: clientId
        });
      }
    }
  }

  // to do
  // public async broadcast() {}

  public send(type: string, message: string) {
    this._addToMessageQueue(type, message);
  }
}