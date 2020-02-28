import Sender from "./sender.ts";
import { MESSAGE_TYPE } from "../lib/io_types.ts";
import { RESERVED_EVENTS } from "../lib/reserved_event_types.ts";

export default class EventEmitter {
  private events: Object;
  private clients: Object;
  private sender: Sender;

  constructor() {
    this.events = {};
    this.clients = {};
    this.sender = new Sender();
  }

  public getClients() {
    return this.clients;
  }

  public getEvents() {
    return this.events;
  }

  private addEvent(type: string, cb: any) {
    if (!this.events[type]) {
      this.events[type] = { listeners: new Map(), callbacks: [] };
    }

    this.events[type].callbacks.push(cb);
  }

  public addListener(type: string, clientId: any) {
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
    if (RESERVED_EVENTS.includes(type)) {
      throw new Error(`${RESERVED_EVENTS} are reserved event types.`);
    }
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

  public async checkEvent(message: MESSAGE_TYPE, clientId: number) {
    let result = new TextDecoder().decode(message);
    let parseMessage = {};
    try {
      parseMessage = JSON.parse(result);
    } catch(err) {
      throw new Error(err);
    }

    for await (let type of Object.keys(parseMessage)) {
      if (type === 'listeningTo') {
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

  public send(type: string, message: string) {
    this._addToMessageQueue(type, message);
  }
}
