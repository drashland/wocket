import Sender from "./sender.ts";
import Channel from "./channel.ts";
import Client from "./client.ts";

export class EventEmitter {
  public clients: any = {};
  public channels: any = {};
  public sender: Sender;
  private channel_being_created: string = "";

  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////

  constructor() {
    this.sender = new Sender();
  }

  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////

  /**
   * Adds a new client.
   * @param int - Client's socket connection id.
   * @param clientSocket
   */
  public addClient(clientId: number, clientSocket: any) {
    const client = new Client(clientId, clientSocket);
    this.clients[clientId] = client;
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
   *    Broadcasts a message to all receivers of a channel. pkgOrMessage does
   *    not contain "from" key.
   *
   * @param string channelName
   * @param any message
   *     Message to be sent.
   * 
   * @return void
   */
  public broadcast(channelName: string, pkgOrMessage: any): void {
    if (pkgOrMessage.from) delete pkgOrMessage.from;
    this.to(channelName, pkgOrMessage);
  }

  /**
   * @description
   *     Close a channel.
   *
   * @param string channelName
   */
  public closeChannel(channelName: string): void {
    delete this.channels[channelName];
  }

  /**
   * @description
   *     Create a new channel. Basically, this creates a new event that clients
   *     can listen to. Ther server can also send messages to this new
   *     event/channel.
   *
   * @param string name
   *
   * @return this
   */
  public createChannel(name: string): this {
    this.channel_being_created = name;
    if (!this.channels[name]) {
      this.channels[name] = new Channel(name);
      return this;
    }

    throw new Error(`Channel "${name}" already exists!`);
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
   *     This is the same as creating a new channel (createChannel()), but for
   *     internal use.
   * 
   * @param string channelName
   *     The name of the channel.
   * @param Function cb
   *     Callback to be invoked when a message is sent to the channel.
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
   *     This method should only be chained after createChannel(). This allows
   *     for better semantics when creating channels. For example:
   *
   *         socketServer.createChannel("channel").onMessage(() => { ... });
   *
   * @param Function cb
   *     The callback to invoke when the channel this method is chained to
   *     receives a message.
   *
   * @return this
   */
  public onMessage(cb: Function): this {
    this.channels[this.channel_being_created].callbacks.push(cb);
    return this;
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
  }

  /**
   * @description
   *     Send a message to a channel, excluding the sender.
   *
   * @param string channelName
   *     The channel to send the message to.
   * @param any message
   *     Message to be sent.
   * 
   * @return void
   */
  public to(channelName: string, pkgOrMessage: any): void {
    let pkg: any = {};
    if (typeof pkgOrMessage === "string") {
      pkg.message = {};
      pkg.message = { text: pkgOrMessage };
    } else {
      pkg = pkgOrMessage;
    }
    this._addToPackageQueue(channelName, pkg);
  }

  // FILE MARKER - METHODS - PRIVATE ///////////////////////////////////////////

  /**
   * @param string channelName
   * @param string message
   *
   * @return void
   */
  private _addToPackageQueue(channelName: string, pkg: any): void {
    if (!this.channels[channelName]) {
      throw new Error(`No receivers for "${channelName}" channel.`);
    }
    this.sender.add({
      ...this.channels[channelName],
      message: pkg.message,
      from: pkg.from || null,
      channelName,
    });
  }
}
