import {
  acceptWebSocket,
  BufReader,
  BufWriter,
  DenoServer,
  HTTPOptions,
  HTTPSOptions,
  isWebSocketCloseEvent,
  serve,
  ServerRequest,
  serveTLS,
  WebSocket,
  WebSocketEvent,
} from "../deps.ts";
import { Channel } from "./channel.ts";
import { Client } from "./client.ts";
import { EventEmitter } from "./event_emitter.ts";
import { IIncomingEvent } from "./interfaces.ts";
import { RESERVED_EVENT_NAMES } from "./reserved_event_names.ts";
import { OnChannelCallback } from "./types.ts";

interface DenoWebSocketRequest extends ServerRequest {
  conn: Deno.Conn;
  bufWriter: BufWriter;
  bufReader: BufReader;
  headers: Headers;
}

const decoder = new TextDecoder();

/**
 * The `SocketServer` class is responsible for creating a users socket server.
 * Similar to how Drash.Http.Server creates a server instance.
 */
export class Server extends EventEmitter {
  /**
   * A list of key value pairs describing all created channels, where the key is
   * the channel name, and the value represents the channel object.
   */
  public channels: Map<string, Channel> = new Map();

  /**
   * A list of key value pairs describing all clients connected, where the key
   * is the client id, and the value represents the client object.
   */
  public clients: Map<number, Client> = new Map();

  /**
   * A property to hold the Deno server. This property is set in this.run()
   * like so:
   *
   *     this.deno_server = serve();
   */
  public deno_server: DenoServer | null = null;

  /**
   * A property to hold the hostname this server listens on.
   */
  public hostname = "localhost";

  /**
   * A property to hold the port this server listens on.
   */
  public port = 1557;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   */
  constructor() {
    super("wocket_server");
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Close the server.
   */
  public close(): void {
    try {
      if (this.deno_server) {
        this.deno_server.close();
      }
    } catch (_error) {
      // Do. nuh. thing.
    }
  }

  /**
   * Run this server using the ws protocol.
   *
   * @param options - See HTTPOptions.
   *
   * @returns A Promise of DenoServer.
   */
  public run(options: HTTPOptions): DenoServer {
    this.handleServerOptions(options);

    this.deno_server = serve(options);

    this.createReservedChannels();

    this.listenForConnections();

    return this.deno_server;
  }

  /**
   * Run this server using the wss protocol.
   *
   * @param options - See HTTPOptions.
   *
   * @returns A Promise of the DenoServer.
   */
  public runTLS(options: HTTPSOptions): DenoServer {
    this.handleServerOptions(options);

    this.deno_server = serveTLS(options);

    this.createReservedChannels();

    this.listenForConnections();

    return this.deno_server;
  }

  protected createReservedChannels(): void {
    this.channels.set("connect", new Channel("connect"));
    this.channels.set("disconnect", new Channel("disconnect"));
  }

  /**
   * Listen for socket connections. These sockets are clients that are trying to
   * connect to this server.
   */
  protected async listenForConnections() {
    for await (const request of this.deno_server!) {
      try {
        this.handleConnectionRequest(request as DenoWebSocketRequest);
      } catch (error) {
        console.error(
          `Failed to handle WebSocket connection request: ${error}`,
        );
      }
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PROTECTED /////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @param options - See HTTPOptions or HTTPSOptions.
   */
  protected handleServerOptions(options: HTTPOptions | HTTPSOptions): void {
    if (options.hostname) {
      this.hostname = options.hostname;
    }

    if (options.port) {
      this.port = options.port;
    }
  }

  protected getClient(id: number): Client {
    const client = this.clients.get(id);

    if (!client) {
      throw new Error(`Client with ID #${id} does not exist.`);
    }

    return client;
  }

  /**
   * Handle connection requests to this server.
   *
   * @param request - The request coming into the server. For example, if a user
   * were to open their browser's console and type ...
   *
   *    const connection = new WebSocket("ws://127.0.0.1:1777");
   *
   * ... then this method would ultimately handle that connection request.
   */
  protected async handleConnectionRequest(
    request: DenoWebSocketRequest,
  ): Promise<void> {
    const { conn, headers, r: bufReader, w: bufWriter } = request;

    const clientSocket = await acceptWebSocket({
      bufReader,
      bufWriter,
      conn,
      headers,
    });

    // Create the client
    const client = new Client(conn.rid, clientSocket);
    this.clients.set(client.id, client);

    // Connect the client to this server
    this.handleReservedEvent(client, "connect");
  }

  /**
   * Removes an existing client from this server and any channels that the
   * client is listening to.
   *
   * @param clientId - The ID of the client's socket connection.
   */
  public disconnectClient(clientId: number): void {
    const client = this.getClient(clientId);

    client.disconnectFromAllChannels();

    // Check if the client is already closed. If this is not checked, then the
    // server will crash.
    if (!client.socket.isClosed) {
      client.socket.close(1000);
    }

    this.clients.delete(client.id);
  }

  /**
   * Listen for events sent from the client.
   *
   * @param clientSocket
   */
  protected async listenForClientEvents(client: Client): Promise<void> {
    for await (const webSocketEvent of client.socket) {
      try {
        this.handleWebSocketEvent(client, webSocketEvent);
      } catch (error) {
        // Something must have happened to the client's connection on the
        // client's side
        if (client.socket.isClosed) {
          this.handleReservedEvent(client, "disconnect");
          continue;
        }

        try {
          client.socket.send(error.stack ?? error.message);
        } catch (error) {
        }
      }
    }
  }

  protected isReservedEvent(event: WebSocketEvent): boolean {
    if (typeof event !== "string") {
      return false;
    }

    if (!RESERVED_EVENT_NAMES.includes(event.trim())) {
      return false;
    }

    return true;
  }

  protected isJsonEvent(event: WebSocketEvent): boolean {
    if (typeof event !== "string") {
      return false;
    }

    try {
      JSON.parse(event as string);
    } catch (_error) {
      return false;
    }

    return true;
  }

  /**
   * @param message - See Message.
   */
  protected handleWebSocketEvent(client: Client, event: WebSocketEvent): void {
    if (this.isReservedEvent(event)) {
      return this.handleReservedEvent(
        client,
        (event as string).trim(),
      );
    }

    if (this.isJsonEvent(event)) {
      return this.handleMessage(
        client,
        JSON.parse(event as string),
      );
    }

    // if (this.isUnit8ArrayEvent(event)) {
    //   return this.handleMessageAsUnit8Array(client, event);
    // }

    throw new Error(
      "Could not handle event as Unit8Array, JSON, or RESERVED_EVENT.",
    );
  }

  protected handleMessage(client: Client, message: IIncomingEvent): void {

    switch (message.action) {
      // Occurs when a message like the following is received by the client:
      //
      //     {
      //       "action": "connect_to_channels",
      //       "payload": ["channel_1", "channel_2"]
      //     }
      //
      case "connect_to_channels":
        (message.payload as string[]).forEach((channel: string) => {
          this.getChannel(channel).connectClient(client);
          client.socket.send(
            `You have been Connected to the "${channel}" channel.`
          );
        });
        break;

        });
        break;

      case "send_packet":
        const payload = message.payload as {to: string[]; message: unknown};
        payload.to.forEach((channel: string) => {
          this.getChannel(channel).handleMessage(client, payload.message);
        });
        break;
    }
    // message.to.forEach((receiver: string | number) => {
    //   try {
    //     const receiverObj = this.getReceiverOfMessage(receiver);
    //     const result = receiverObj.handleMessage(client, message);
    //     if (!result) {
    //       // TODO: Send to dead letter queue
    //       throw new Error("Failed to send message.");
    //     }
    //   } catch (error) {
    //     return client.socket.send(error.stack);
    //   }
    // });
  }

  protected getReceiverOfMessage(receiver: string | number): Channel | Client {
    const id = +receiver;

    // Not a number? That means the receiver is a channel because all channels
    // are strings and all clients are numbers.
    if (isNaN(id)) {
      return this.getChannel(receiver as string);
    }

    return this.getClient(id);
  }

  /**
   */
  protected handleReservedEvent(
    client: Client,
    eventName: string,
    message?: string,
  ): void {
    switch (eventName) {
      // Occurs when this server tries to connect a client

      case "connect":
        this.getChannel("connect")
          .executeCallbacks(
            new CustomEvent("wocket_reserved", {
              detail: {
                sender: client,
                receiver: this.getChannel("connect"),
                message: `Connected to the server as Client ${client.id}.`
              }
            })
          );
        this.listenForClientEvents(client);
        break;

      // Occurs when this server tries to disconnect a client

      case "disconnect":
        this.getChannel("disconnect")
          .executeCallbacks(
            new CustomEvent("wocket_reserved", {
              detail: {
                sender: client,
                receiver: this.getChannel("disconnect"),
                messagE: "Disconneted from the server.",
              }
            })
          );
        this.disconnectClient(client.id);
        break;

      // Occurs when the client sends "id" as the message

      case "id":
        client.socket.send(`${client.id}`);
        break;

      // Occurs when the client sends "ping" as the message

      case "ping":
        client.socket.send("pong");
        break;

      // Occurs when the client sends "pong" as the message

      case "pong":
        client.socket.send("ping");
        break;

      // Occurs when the server tries to reconnect a client

      case "reconnect":
        // TODO(crookse) Do something on an reconnect event. Could be useful to
        // add a flag to this client.
        break;

      // Occurs when the client sends "test" as the message

      case "test":
        client.socket.send(`Server started on ${this.hostname}:${this.port}.`);
        break;

      default:
        break;
    }
  }

  /**
   * Get all clients.
   *
   * @returns All clients.
   */
  public getClients(): Map<number, Client> {
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
    const channel = this.channels.get(channelName);

    if (!channel) {
      throw new Error(`Channel "${channelName}" does not exist.`);
    }

    return channel;
  }

  /**
   * Get all of the channels.
   *
   * @returns An array with all of the channel names.
   */
  public getChannels(): string[] {
    const channels = [];
    for (const channelName in this.channels) {
      // Ignore the reserved channels
      if (RESERVED_EVENT_NAMES.indexOf(channelName) !== -1) {
        continue;
      }
      channels.push(channelName);
    }
    return channels;
  }

  /**
   * Create and open a channel, and create a listener for events on that channel
   *
   * @param name - The name of the channel.
   * @param cb - See Callback.
   *
   * @example
   *
   *     on<{username: string}>("ping", (event) => {
   *       const username = event.message.username // ok
   *     })
   */
  public on<T>(
    channelName: string,
    cb: OnChannelCallback<T>
  ): void {
    let channel: Channel;

    try {
      channel = this.getChannel(channelName);
    } catch (error) {
      // If we ended up here, then that means the channel doesn't exist, so we
      // create it
      channel = new Channel(channelName);
      this.channels.set(channelName, channel);
    }

    channel.callbacks.push(cb);
  }
}
