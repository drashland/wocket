import Sender from "./sender.ts";
import { MESSAGE_TYPE } from "./lib/io_types.ts";
import { RESERVED_EVENT_NAMES } from "./lib/reserved_event_names.ts";

export default class EventEmitter {
  private events: any;
  private clients: any;
  private sender: Sender;

  constructor() {
    this.events = {};
    this.clients = {};
    this.sender = new Sender();
  }

  /**
   * @return All clients.
   */
  public getClients() {
    return this.clients;
  }

   /**
   * @return All events.
   */
  public getEvents() {
    return this.events;
  }

   /**
   * @description
   *     Adds a new event.
   * 
   * @param eventName string
   * @param cb callback
   *      Callback to be invoked when event is detected.
   * 
   * @return void
   */
  private addEvent(eventName: string, cb: any) {
    if (!this.events[eventName]) {
      this.events[eventName] = { listeners: new Map(), callbacks: [] };
    }

    this.events[eventName].callbacks.push(cb);
  }

   /**
   * @description
   *     Adds a new listener to an event.
   * 
   * @param eventName string
   * @param clientId number
   *      Client's socket connection id.
   * 
   * @return void
   */
  public addListener(eventName: string, clientId: number) {
    if (!this.events[eventName]) {
      this.events[eventName] = { listeners: new Map(), callbacks: [] };
    }

    if (!this.events[eventName].listeners.has(clientId)) {
      this.events[eventName].listeners.set(clientId, this.clients[clientId].socket);
      this.clients[clientId].listeningTo.push(eventName);
    }
  }

  private handleReservedEventNames(eventName: string, clientId: number) {
    switch(eventName) {
      case 'connection':
      case 'disconnect':
        if (this.events[eventName]) {
          this.events[eventName].callbacks.forEach((cb: Function) => {
            cb();
          });
        }
        break;
        default:
          this.addListener(eventName, clientId);
        break;
    }
  }

  /**
   * @description
   *     Adds a new client.
   * 
   * @param socket WebSocket
   * @param clientId int
   *      Client's socket connection id.
   * 
   * @return void
   */
  public addClient(socket: any, clientId: number) {
    this.clients[clientId] = {
      socket,
      listeningTo: [],
    }
    this.handleReservedEventNames('connection', clientId);
  }

   /**
   * @description
   *     Removes an existing client from server and
   *     any events that the client subscribed to.
   * 
   * @param clientId int
   *      Client's socket connection id.
   * 
   * @return void
   */
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
    this.handleReservedEventNames('disconnect', clientId);
  }

   /**
   * @description
   *     Adds a new event.
   * 
   * @param eventName string
   * @param cb callback function
   *     Callback to be invoked when event is detected.
   * 
   * @return void
   */
  public on(eventName: string, cb: Function) {
    this.addEvent(eventName, cb);
  }

  /**
   * @description
   *     Adds a new event.
   * 
   * @param eventName string
   * @param message any
   *     Message to be sent.
   * 
   * @return void
   */
  public async to(eventName: string, message: any) {
    this.sender.add({
      ...this.events[eventName],
      eventName,
      message: typeof message === 'string' ? message : message.message,
      from: typeof message === 'string' ? undefined : message.from,
    });
  }

  private async _addToMessageQueue(eventName: string, message: string) {
    const msg = {
      ...this.events[eventName],
      eventName,
      message,
    };
    this.sender.add(msg);
  }

  /**
   * @description
   *    Decodes and validates incoming messages.
   * 
   * @param message MESSAGE_TYPE
   *     Uint8Array
   * @param clientId int
   *     Client's socket connection id.
   * 
   * @return void
   */
  public async checkEvent(message: MESSAGE_TYPE, clientId: number) {
    let result = new TextDecoder().decode(message);
    let parsedMessage = <any>{};
    try {
      parsedMessage = JSON.parse(result);
    } catch(err) {
      throw new Error(err);
    }

    for await (let eventName of Object.keys(parsedMessage)) {
      if (RESERVED_EVENT_NAMES.includes(eventName)) {
        this.handleReservedEventNames(parsedMessage[eventName], clientId);
      } else if (this.events[eventName]) {
        await this.sender.invokeCallback({
          ...this.events[eventName],
          eventName,
          message: parsedMessage[eventName],
          from: clientId
        });
      }
    }
  }

   /**
   * @description
   *    Pushes a new message to the message queue.
   * 
   * @param eventName string
   * @param message any
   *     Message to be sent.
   * 
   * @return void
   */
  public send(eventName: string, message: string) {
    this._addToMessageQueue(eventName, message);
  }
}
