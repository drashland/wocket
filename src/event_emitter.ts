import { Sender } from "./sender.ts";
import { Channel } from "./channel.ts";
import { Client } from "./client.ts";
import { WebSocket } from "../deps.ts";
import { Packet } from "./packet.ts";
import { RESERVED_EVENT_NAMES } from "./reserved_event_names.ts";

/**
 * The EventEmitter class is responsible for the logic of sending and receiving
 * messages. To do this, it aggregates information on clients, such as tracking
 * how many clients are connected and what channels are open.
 */
export class EventEmitter {
  /**
   * Used to identify this class (when having sent messages) as the Server.
   */
  public id = "Server";

  /**
   * A list of key value pairs describing all created channels, where the key is
   * the channel name, and the value represents the channel object.
   */
  public channels: { [key: string]: Channel } = {};

  /**
   * A list of key value pairs describing all clients connected, where the key
   * is the client id, and the value represents the client object.
   */
  public clients: { [key: number]: Client } = {};

  /**
   * Instance of the Sender class
   */
  public sender: Sender;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   */
  constructor() {
    this.sender = new Sender();
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Adds a new client.
   *
   * @param clientId - Client's socket connection id.
   * @param clientSocket - The client as a WebSocket instance.
   *
   * @returns A Client instance for use in the socket-client connection
   * lifecycle.
   */
  public createClient(clientId: number, clientSocket: WebSocket): Client {
    const client = new Client(clientId, clientSocket);
    this.clients[clientId] = client;
    return client;
  }

  /**
   * Adds a new client to a channel. Once the client is added, the client will
   * be able to receive messages sent to the channel.
   *
   * @param channelName - The name of the channel.
   * @param clientId - Client's socket connection id.
   */
  public addClientToChannel(channelName: string, clientId: number): void {
    if (!this.channels[channelName]) {
      throw new Error(`Channel "${channelName}" does not exist.`);
    }

    if (!this.channels[channelName].listeners.has(clientId)) {
      this.channels[channelName].listeners.set(
        clientId,
        this.clients[clientId].socket,
      );
      this.clients[clientId].listening_to.push(channelName);
      return;
    }

    throw new Error(`Already listening to ${channelName}.`);
  }

  /**
   * Broadcasts a message to all receivers of a channel. pkgOrMessage does not
   * contain "from" key.
   *
   * @param channelName - The name of the channel.
   * @param message - The message to broadcast.
   */
  public broadcast(channelName: string, message: unknown): void {
    this.to(channelName, message);
  }

  /**
   * Close a channel.
   *
   * @param channelName - The name of the channel.
   */
  public closeChannel(channelName: string): void {
    for (const client of Object.values(this.clients)) {
      client.socket.send(`${channelName} closed.`);
    }
    delete this.channels[channelName];
  }

  /**
   * Get all clients.
   *
   * @returns All clients.
   */
  public getClients(): { [key: string]: Client } {
    return this.clients;
  }

  /**
   * Get a channel by the channel name
   *
   * @param channelName - The name of the channel to retrieve
   *
   * @returns The specified channel.
   */
  public getChannel(channelName: string): Channel {
    return this.channels[channelName];
  }

  /**
   * Get all of the channels.
   *
   * @returns An array with all of the channel names.
   */
  public getChannels(): string[] {
    let channels = [];
    for (let channelName in this.channels) {
      // Ignore the following channels
      if (RESERVED_EVENT_NAMES.indexOf(channelName) !== -1) {
        continue;
      }
      channels.push(channelName);
    }
    return channels;
  }

  /**
   * This is the same as creating a new channel (openChannel()), but for
   * internal use.
   *
   * @param name - The name of the channel.
   * @param cb - Callback to be invoked when a message is sent to the channel.
   */
  public on(name: string, cb: Function): void {
    if (!this.channels[name]) {
      this.channels[name] = new Channel(name);
    }
    this.channels[name].callbacks.push(cb);
  }

  /**
   * Create a new channel. Basically, this creates a new event that clients can
   * listen to. Ther server can also send messages to this new event/channel.
   *
   * @param channelName - The name of the channel.
   *
   * @returns this
   */
  public openChannel(channelName: string): void {
    if (!this.channels[channelName]) {
      this.channels[channelName] = new Channel(channelName);
      return;
    }

    throw new Error(`Channel "${channelName}" already exists!`);
  }

  /**
   * Removes an existing client from server and any channels that the client
   * subscribed to.
   *
   * @param clientId - The ID of the client's socket connection.
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
   * Removes a client from a channel.
   *
   * @param channelName - The name of the channel.
   * @param clientId - Client's socket connection id.
   */
  public removeClientFromChannel(channelName: string, clientId: number): void {
    if (!this.channels[channelName]) {
      throw new Error(`Channel "${channelName}" not found.`);
    }

    if (this.channels[channelName].listeners.has(clientId)) {
      this.channels[channelName].listeners.delete(clientId);
      const index = this.clients[clientId].listening_to.indexOf(channelName);
      if (index > -1) {
        this.clients[clientId].listening_to.splice(index, 1);
        return;
      }
    }

    throw new Error(`Not connected to ${channelName}.`);
  }

  /**
   * Send a message to a channel, excluding the sender.
   *
   * @param channelName - The name of the channel.
   * @param message - The message to send.
   * @param clientToSendTo - Optional. If you wish to send the event to a specific client, specify the client id
   */
  public to(
    channelName: string,
    message: unknown,
    clientToSendTo?: number,
  ): void {
    this.queuePacket(
      new Packet(
        this,
        channelName,
        message,
      ),
      clientToSendTo,
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PRIVATE ///////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Add a packet to the queue so that the message contained in the packet can
   * be sent to the client(s).
   *
   * @param packet - See Packet.
   * @param clientToSendTo - If set, only send the packet to that client
   */
  private queuePacket(packet: Packet, clientToSendTo?: number): void {
    if (!this.channels[packet.to]) {
      throw new Error(`Channel "${packet.to}" not found.`);
    }
    this.sender.add(packet, this.channels[packet.to], clientToSendTo);
  }
}
