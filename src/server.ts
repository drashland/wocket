import {
  BufWriter,
  BufReader,
  acceptWebSocket,
  DenoServer,
  HTTPOptions,
  HTTPSOptions,
  isWebSocketCloseEvent,
  serve,
  serveTLS,
  ServerRequest,
  WebSocket,
  WebSocketEvent,
} from "../deps.ts";
import { Channel } from "./channel.ts";
import { Client } from "./client.ts";
import { EventEmitter } from "./event_emitter.ts";
import { ITransmitterOptions } from "./interfaces.ts";
import { Packet } from "./packet.ts";
import { Callback } from "./types.ts";
// import { Transmitter } from "./transmitter.ts";
import { RESERVED_EVENT_NAMES } from "./reserved_event_names.ts";

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

  /**
   * A property to hold the transmitter. The transmitter is in charge of
   * transmitting data throughout the server-client lifecycle.
   */
  // public transmitter: Transmitter;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   *
   * @param transmitterOptions - See ITransmitterOptions.
   */
  constructor(transmitterOptions?: ITransmitterOptions) {
    super();
    // this.transmitter = new Transmitter(this, transmitterOptions);
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Close the server.
   */
  public async close(): Promise<void> {
    // Allow any messages in the pipeline to be properly handled before closing.
    // Obviously this is a hack, but removing this block will sometimes cause
    // some test cases to fail - still unsure why.
    const p = new Promise((resolve) => {
      // No real reason for it to be 1 other than this fixes the issue as stated
      // above; and isn't a long ass time to wait - I (Edward) did have it at
      // 500, then Eric suggested what happens at 1ms, so we changed it to that
      // and funnily enough, it still fixes thee issue, which is why it is 1ms.
      setTimeout(() => {
        resolve("");
      }, 1);
    });

    await p;

    // If there are messages still being sent, then make sure all of them are
    // sent before closing.
    while (true) {
      if (!this.hasPackets()) {
        if (this.deno_server) {
          try {
            this.deno_server.close();
          } catch (error) {
            break;
          }
        }
      }
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
   */
  protected async handleConnectionRequest(
    request: DenoWebSocketRequest
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
    this.handleEventAsReservedEvent(client, "connect");
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

    client.socket.close(1000);

    this.clients.delete(client.id);
  }

  /**
   * Listen for events sent from the client.
   *
   * @param clientSocket
   */
  protected async listenForClientEvents(client: Client): Promise<void> {
    for await (const event of client.socket) {
      try {
        this.handleEvent(client, event);
      } catch (error) {
        client.socket.send(error.message);
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
      JSON.parse(event);
    } catch (_error) {
      return false;
    }

    return true;
  }

  /**
   * @param packet - See Packet.
   */
  protected handleEvent(client: Client, event: WebSocketEvent): void {
    if (this.isReservedEvent(event)) {
      return this.handleEventAsReservedEvent(client, event as string);
    }

    if (this.isJsonEvent(event)) {
      return this.handleEventAsJson(client, event as string);
    }

    // if (this.isUnit8ArrayEvent(event)) {
    //   return this.handleEventAsUnit8Array(client, event);
    // }

    client.socket.send("Could not handle event as Unit8Array, JSON, or RESERVED_EVENT.");
  }

  protected handleEventAsJson(client: Client, jsonString: string): void {
    const json = JSON.parse(jsonString);

    if (!json.action) {
      throw new Error(`Event does not contain "action" field.`);
    }

    switch (json.action) {
      // If the following event was received:
      //
      // {
      //   "action": "send_packet",
      //   "to": ["array of channels or client IDs"],
      //   "data": <some type -- could be anything>
      // }
      //
      case "send_packet":
        if (!json.to) {
          throw new Error(`Event does not contain "to" field.`);
        }

        if (!json.data && json.data != "") {
          throw new Error(`Event does not contain "data" field.`);
        }

        const packets: Packet[] = [];

        json.to.forEach((to: string | number) => {
          packets.push(new Packet(
            client,
            this.getReceiverOfPacket(to as string),
            json.data
          ));
        });

        console.log(packets);
        break;

      default:
        client.socket.send(`Could not handle event as JSON. Event "action" unknown.`);
        break;
    }
  }

  protected getReceiverOfPacket(receiver: string): Channel | Client {
    const id = +receiver; // Convert to an number

    // If the recevier is not a number, then we know it's a channel because all
    // channels are strings and all clients are numbers
    if (isNaN(id)) {
      return this.getChannel(receiver);
    }

    return this.getClient(id);
  }

  /**
   * @param packet - See Packet.
   */
  protected handleEventAsReservedEvent(client: Client, eventName: string): void {
    switch (eventName) {

      // Occurs when this server tries to connect a client

      case "connect":
        this.getChannel("connect").executeCallbacks();
        this.listenForClientEvents(client);
        break;

      // Occurs when this server tries to disconnect a client

      case "disconnect":
        this.getChannel("disconnect").executeCallbacks();
        this.disconnectClient(client.id);
        break;

      // Occurs when the client sends "id" as the message

      case "id":
        client.socket.send(`Client ID: ${client.id}`);
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
      // Ignore the following channels
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
   */
  public on(channelName: string, cb: Callback): void {
    let channel: Channel;

    try {
      channel = this.getChannel(channelName);
    } catch (error) {
      // If we ended up here, then that means the channel doesn't exist
      channel = new Channel(channelName);
      this.channels.set(channelName, channel);
    }

    channel.addCallback(cb);
  }
}
