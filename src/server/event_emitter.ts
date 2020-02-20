export default class EventEmitter {
  private events: any;
  private clients: any;

  constructor() {
    this.events = {};
    this.clients = {};
  }

  private addEvent(type: string, cb: any) {
    if (!this.events[type]) {
      this.events[type] = { listeners: [], callbacks: [] };
    }

    // this should maybe be simplified to just type and options?
    this.events[type].callbacks.push(cb);
  }

  private addListener(type: string, clientId: any) {
    if (!this.events[type]) {
      this.events[type] = { listeners: [], callbacks: [] };
    }
    if (!this.events[type].listeners.includes(clientId)) {
      this.events[type].listeners.push(clientId);
    }
    return true;
  }

  public addClient(socket, clientId) {
    this.clients[clientId] = socket;
    console.log("Number of sockets connected: ", Object.keys(this.clients));
  }

  public removeClient(clientId) {
    delete this.clients[clientId];
    // remove reference in listeners... redo this struct.
  }

  public on(type: string, cb: any) {
    this.addEvent(type, cb);
  }

  public async to(type: string, message: string) {
    this.send(type, message);
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
        await this.invokeCallback(type, parseMessage[type]);
      }
    }
  }

  // to do
  // public async broadcast() {}

  public async send(type: string, message: string): Promise<void> {
    if (this.events[type].listeners) {
      const encodedMessage = new TextEncoder().encode(JSON.stringify({ [type]: message }));
      for await (let listener of this.events[type].listeners) {
        if (this.clients[listener]) this.clients[listener].send(encodedMessage);
      }
    }
  }

  private async invokeCallback(type: string, message: string, ): Promise<void> {
    if (type && !this.events[type]) {
      console.log(`This event does not exist: ${type}`);
      return;
    }
    if (this.events[type].callbacks) {
      for await (let cb of this.events[type].callbacks) {
        await this.send(cb, message);
      }
    }
  }
}