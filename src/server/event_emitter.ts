import { MessasgeType } from "../lib/io_types.ts";

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

export type IncomingMessageTypes = Uint8Array | String;

export default class EventEmitter {
  private events: Object;
  private clients: Object;
  private sender: Sender;

  constructor() {
    this.events = {};
    this.clients = {};
    this.sender = new Sender();
  }

  private addEvent(type: string, cb: any) {
    if (!this.events[type]) {
      this.events[type] = { listeners: new Map(), callbacks: [] };
    }

    this.events[type].callbacks.push(cb);
  }

  private addListener(type: string, clientId: any) {
    if (!this.events[type]) {
      this.events[type] = { listeners: new Map(), callbacks: [] };
    }
    if (!this.events[type].listeners.has(clientId)) {
      this.events[type].listeners.set(clientId, this.clients[clientId].socket);
      this.clients[clientId].listeningTo.push(type);
    }
    return true;
  }

  public addClient(socket, clientId) {
    this.clients[clientId] = {
      socket,
      listeningTo: [],
    }
  }
  
  public async removeClient(clientId) {
    if (!this.clients[clientId]) return;
    if (this.clients[clientId].listeningTo) {
      this.clients[clientId].listeningTo.forEach((to) => {
        if (this.events[to]) {
          this.events[to].listeners.delete(clientId);
        }
      });
    };
    await this.clients[clientId].socket.close(1000);
    delete this.clients[clientId];
  }

  public on(type: string, cb: Function) {
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

  public async checkEvent(message: MessasgeType, clientId: number) {
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