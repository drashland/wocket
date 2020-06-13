import Sender from "./sender.ts";
import Channel from "./channel.ts";
import Client from "./client.ts";
import { MESSAGE_TYPE } from "./io_types.ts";
import { RESERVED_EVENT_NAMES } from "./reserved_event_names.ts";

export default class EventEmitter {
  public clients: any = {};
  private channels: any = {};
  private sender: Sender;
  private channel_being_created: string = "";

  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////

  constructor() {
    this.sender = new Sender();
  }

  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////

  /**
   * @description
   *     Adds a new client.
   * 
   * @param clientId int
   *      Client's socket connection id.
   * @param WebSocket socket
   * 
   * @return void
   */
  public addClient(clientId: number, clientSocket: any) {
    const client = new Client(clientId, clientSocket);
    this.clients[clientId] = client;
    this._handleReservedEventNames("connection", clientId);
    return client;
  }

  /**
   * @description
   *     Adds a new listener to an event.
   *
   * @param string channelName
   * @param number clientId
   *      Client's socket connection id.
   *
   * @return void
   */
  public addListener(channelName: string, clientId: number): void {
    if (!this.channels[channelName]) {
      this.channels[channelName] = new Channel(channelName);
    }

    if (!this.channels[channelName].listeners.has(clientId)) {
      this.channels[channelName].listeners.set(
        clientId,
        this.clients[clientId].socket,
      );
      this.clients[clientId].listening_to.push(channelName);
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

    for await (let channelName of Object.keys(parsedMessage)) {
      if (RESERVED_EVENT_NAMES.includes(channelName)) {
        this._handleReservedEventNames(parsedMessage[channelName], clientId);
      } else if (this.channels[channelName]) {
        await this.sender.invokeCallback({
          ...this.channels[channelName],
          channelName,
          message: parsedMessage[channelName],
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
   * @return Channel
   *     Return the specified channel.
   */
  public getChannel(name: string): Channel {
    return this.channels[name];
  }

  /**
   * @return any
   *     Return all channels.
   */
  public getChannels(): any {
    let channels = [];
    for (let name in this.channels) {
      // Ignore the following channels
      if (
        name === "connection" ||
        name === "disconnect"
      ) {
        continue;
      }
      channels.push(name);
    }
    return channels;
  }

  /**
   * @description
   *     Adds a new event.
   *
   * @param string name
   *
   * @return void
   */
  public createChannel(name: string): this {
    this.channel_being_created = name;
    if (!this.channels[name]) {
      this.channels[name] = new Channel(name);
      return this;
    }

    throw new Error(`Channel "${name}" already exists!`);
  }

  public onMessage(cb: Function): this {
    this.channels[this.channel_being_created].callbacks.push(cb);
    return this;
  }

  /**
   * @description
   *     Adds a new event.
   * 
   * @param string channelName
   * @param Function cb
   *     Callback to be invoked when event is detected.
   * 
   * @return void
   */
  public on(name: string, cb: Function): void {
    if (!this.channels[name]) {
      this.channels[name] = new Channel(name);
    }
    this.channels[name].callbacks.push(cb);
  }

  /**
   * @description
   *     Removes an existing client from server and any channels that the client
   *     subscribed to.
   * 
   * @param number clientId
   *      Client's socket connection id.
   * 
   * @return void
   */
  public removeClient(clientId: number): void {
    if (!this.clients[clientId]) return;
    if (this.clients[clientId].listening_to) {
      this.clients[clientId].listening_to.forEach((to: string) => {
        if (this.channels[to]) {
          this.channels[to].listeners.delete(clientId);
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
   * @param string channelName
   * @param any message
   *     Message to be sent.
   * 
   * @return void
   */
  public send(channelName: string, message: string): void {
    this._addToMessageQueue(channelName, message);
  }

  /**
   * @description
   *     Adds a new event.
   * 
   * @param string channelName
   * @param any message
   *     Message to be sent.
   * 
   * @return void
   */
  public to(eventName: string, message: any): void {
    this.sender.add({
      ...this.channels[eventName],
      eventName,
      message: typeof message === "string" ? message : message.message,
      from: typeof message === "string" ? undefined : message.from,
    });
  }

  // FILE MARKER - METHODS - PRIVATE ///////////////////////////////////////////

  /**
   * @param string channelName
   * @param string message
   *
   * @return void
   */
  private _addToMessageQueue(
    channelName: string,
    message: string,
  ): void {
    const msg = {
      ...this.channels[channelName],
      channelName,
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
        if (this.channels[eventName]) {
          this.channels[eventName].callbacks.forEach((cb: Function) => {
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
