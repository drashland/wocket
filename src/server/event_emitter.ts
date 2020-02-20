export default class EventEmitter {
  private events: any;
  private clients: any;

  constructor() {
    this.events = {};
    this.clients = {};
  }

  private addEvent(type: string, cb?: any) {
    if (!this.events[type]) {
      this.events[type] = { listeners: [], callbacks: [] };
    }

    // this should maybe be simplified to just type and options?
    const fn = (message) => cb(message);
    this.events[type].callbacks.push(fn);
    return this;
  }

  private addListener(type: string, clientId: any) {
    if (!this.events[type]) {
      this.events[type] = {
        listeners: [],
        callbacks: [],
      };
    }
    console.log(this.events[type].listeners);
    if (!this.events[type].listeners.includes(clientId)) {
      this.events[type].listeners.push(clientId);
    }
    console.log('inside of add listener:', type, clientId, this.events[type])
    return true;
  }

  public addClient(socket, clientId) {
    this.clients[clientId] = socket;
    console.log("Number of sockets connected: ", Object.keys(this.clients));
  }

  public on(type: string, cb: any) {
    return this.addEvent(type, cb);
  }

  public async to(type: string, message: string) {
    for await (let listener of this.events[type].listeners) {
      if (this.clients[listener]) this.clients[listener].send(message);
    }
  }

  public async checkEvent(message: any, clientId: any) {
    let result = new TextDecoder().decode(message);
    let parseMessage = {};
    try {
      parseMessage = JSON.parse(result);
    } catch(err) {
      result = result.toString();
      console.log(result);
      const messages = result.split(/(}{})/);
      console.log(messages);
      for (let i of messages) {
         const parsed = JSON.parse(messages[i]);
         Object.assign(parseMessage, parsed);
      }
    }
    console.log(parseMessage);
    for await (let type of Object.keys(parseMessage)) {
      if (type === 'eventType') {
        console.log('adding listener', parseMessage[type], clientId);
        this.addListener(parseMessage[type], clientId);
      } else if (this.events[type]) {
        console.log(type, parseMessage[type])
        await this.send(type, parseMessage[type]);
      }
    }
    return true;
  }

  public async broadcast(message: string) {
    const clients  = Object.keys(this.clients).map(client => this.clients[client]);
    for await (let client of clients) {
      await client.send(message);
    }
  }

  public async send(type: string, message: string): Promise<void> {
    console.log('TRYING TO SEND"', type, message, this.events[type])
    if (!this.events[type]) {
      console.log(`This event does not exist: ${type}`);
      return;
    }
    if (this.events[type].listeners.length) {
      for await (let listener of this.events[type].listeners) {
        const result = new TextEncoder().encode(JSON.stringify({ [type]: message }));
        if (this.clients[listener]) this.clients[listener].send(result);
      }
    } else {
      if (this.events[type].callbacks) {
        for await (let cb of this.events[type].callbacks) {
          await cb(message);
        }
      }
    }
  }
}