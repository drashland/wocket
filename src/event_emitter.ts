import Sender from "./sender.ts";
import { MESSAGE_TYPE } from "./io_types.ts";
import { RESERVED_EVENT_NAMES } from "./reserved_event_names.ts";

export default class EventEmitter {
  private clients: any = {};
  private events: any = {};
  private sender: Sender;

  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////

  constructor() {
    this.sender = new Sender();
  }

  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////

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
    };
    this._handleReservedEventNames("connection", clientId);
  }

  /**
   * @description
   *     Adds a new listener to an event.
   *
   * @param string eventName
   * @param number clientId
   *      Client's socket connection id.
   *
   * @return void
   */
  public addListener(eventName: string, clientId: number): void {
    if (!this.events[eventName]) {
      this.events[eventName] = { listeners: new Map(), callbacks: [] };
    }

    if (!this.events[eventName].listeners.has(clientId)) {
      this.events[eventName].listeners.set(
        clientId,
        this.clients[clientId].socket,
      );
      this.clients[clientId].listeningTo.push(eventName);
    }
  }

  /**
   * @description
   *    Decodes and validates incoming messages.
   * 
   * @param MESSAGE_TYPE message
   *     Uint8Array
   * @param number clientId
   *     Client's socket connection id.
   * 
   * @return Promise<void>
   */
  public async checkEvent(
    message: MESSAGE_TYPE,
    clientId: number,
  ): Promise<void> {
    let result = new TextDecoder().decode(message);
    let parsedMessage = <any> {};
    try {
      parsedMessage = JSON.parse(result);
    } catch (err) {
      throw new Error(err);
    }

    for await (let eventName of Object.keys(parsedMessage)) {
      if (RESERVED_EVENT_NAMES.includes(eventName)) {
        this._handleReservedEventNames(parsedMessage[eventName], clientId);
      } else if (this.events[eventName]) {
        await this.sender.invokeCallback({
          ...this.events[eventName],
          eventName,
          message: parsedMessage[eventName],
          from: clientId,
        });
      }
    }
  }

  /**
   * @return any
   *     Return all clients.
   */
  public getClients(): any {
    return this.clients;
  }

  /**
   * @return any
   *     Return all events.
   */
  public getEvents(): any {
    return this.events;
  }

  /**
   * @description
   *     Adds a new event.
   * 
   * @param string eventName
   * @param Function cb
   *     Callback to be invoked when event is detected.
   * 
   * @return void
   */
  public on(eventName: string, cb: Function): void {
    this._addEvent(eventName, cb);
  }

  /**
   * @description
   *     Removes an existing client from server and any events that the client
   *     subscribed to.
   * 
   * @param number clientId
   *      Client's socket connection id.
   * 
   * @return Promise<void>
   */
  public async removeClient(clientId: number): Promise<void> {
    if (!this.clients[clientId]) return;
    if (this.clients[clientId].listeningTo) {
      this.clients[clientId].listeningTo.forEach((to: string) => {
        if (this.events[to]) {
          this.events[to].listeners.delete(clientId);
        }
      });
    }

    delete this.clients[clientId];
    this._handleReservedEventNames("disconnect", clientId);
  }

  /**
   * @description
   *    Pushes a new message to the message queue.
   * 
   * @param string eventName
   * @param any message
   *     Message to be sent.
   * 
   * @return void
   */
  public send(eventName: string, message: string): void {
    this._addToMessageQueue(eventName, message);
  }

  /**
   * @description
   *     Adds a new event.
   * 
   * @param string eventName
   * @param any message
   *     Message to be sent.
   * 
   * @return Promise<void>
   */
  public async to(eventName: string, message: any): Promise<void> {
    this.sender.add({
      ...this.events[eventName],
      eventName,
      message: typeof message === "string" ? message : message.message,
      from: typeof message === "string" ? undefined : message.from,
    });
  }

  // FILE MARKER - METHODS - PRIVATE ///////////////////////////////////////////

  /**
   * @description
   *     Adds a new event.
   *
   * @param string eventName
   * @param Function callback
   *      Callback to be invoked when event is detected.
   *
   * @return void
   */
  private _addEvent(eventName: string, cb: any): void {
    if (!this.events[eventName]) {
      this.events[eventName] = { listeners: new Map(), callbacks: [] };
    }

    this.events[eventName].callbacks.push(cb);
  }

  /**
   * @param string eventName
   * @param string message
   *
   * @return Promise<void>
   */
  private async _addToMessageQueue(
    eventName: string,
    message: string,
  ): Promise<void> {
    const msg = {
      ...this.events[eventName],
      eventName,
      message,
    };
    this.sender.add(msg);
  }

  /**
   * @param string eventName
   * @param number clientId
   *
   * @return void
   */
  private _handleReservedEventNames(eventName: string, clientId: number): void {
    switch (eventName) {
      case "connection":
      case "disconnect":
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
}
