import Sender from "./sender.ts";
import { MESSAGE_TYPE } from "./lib/io_types.ts";
import { RESERVED_EVENT_TYPES } from "./lib/reserved_event_types.ts";

export default class EventEmitter {
  private events: any;
  private clients: any;
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

  public addListener(type: string, clientId: number) {
    if (!this.events[type]) {
      this.events[type] = { listeners: new Map(), callbacks: [] };
    }

    if (!this.events[type].listeners.has(clientId)) {
      this.events[type].listeners.set(clientId, this.clients[clientId].socket);
      this.clients[clientId].listeningTo.push(type);
    }
  }

  private handleReservedEventTypes(type: string, clientId: number) {
    switch(type) {
      case 'connection':
      case 'disconnect':
        if (this.events[type]) {
          this.events[type].callbacks.forEach((cb: Function) => {
            cb();
          });
        }
        break;
        default:
          this.addListener(type, clientId);
        break;
    }
  }

  public addClient(socket: any, clientId: number) {
    this.clients[clientId] = {
      socket,
      listeningTo: [],
    }
    this.handleReservedEventTypes('connection', clientId);
  }
  
  public async removeClient(clientId: number) {
    if (!this.clients[clientId]) return;
    if (this.clients[clientId].listeningTo) {
      this.clients[clientId].listeningTo.forEach((to: string) => {
        if (this.events[to]) {
          this.events[to].listeners.delete(clientId);
        }
      });
    };

    delete this.clients[clientId];
    this.handleReservedEventTypes('disconnect', clientId);
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

  public async checkEvent(message: MESSAGE_TYPE, clientId: number) {
    let result = new TextDecoder().decode(message);
    let parseMessaged = <any>{};
    try {
      parseMessaged = JSON.parse(result);
    } catch(err) {
      throw new Error(err);
    }

    for await (let type of Object.keys(parseMessaged)) {
      if (RESERVED_EVENT_TYPES.includes(type)) {
        this.handleReservedEventTypes(parseMessaged[type], clientId);
      } else if (this.events[type]) {
        await this.sender.invokeCallback({
          ...this.events[type],
          type,
          message: parseMessaged[type],
          from: clientId
        });
      }
    }
  }

  public send(type: string, message: string) {
    this._addToMessageQueue(type, message);
  }
}
