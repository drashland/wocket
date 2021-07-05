import {
  acceptWebSocket,
  BufReader,
  BufWriter,
  DenoServer,
  HTTPOptions,
  HTTPSOptions,
  serve,
  ServerRequest,
  serveTLS,
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

/**
 * This class is responsible for creating a users socket server, maintaining the
 * connections between sockets, and handling packets to and from sockets.
 */
export class Server extends EventEmitter {
  /**
   * A map of all created channels. The key is the channel name and the value is
   * the channel object.
   */
  public channels: Map<string, Channel> = new Map();

  /**
   * A map of all clients connected to this server. The key is the client's ID
   * and the value is the client object.
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
  public hostname = "0.0.0.0";

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
   * Close this server.
   */
  public close(): void {
    try {
      if (this.deno_server) {
        this.deno_server.close();
      }
    } catch (_error) {
      // Do. nuh. thing. The server is probably closed if this try-catch block
      // errors out.
    }
  }

  /**
   * Close the specified channel.
   *
   * @param channelName - The name of the channel.
   */
  public closeChannel(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel === undefined) {
      return;
    }
    channel.close();
    this.channels.delete(channelName);
  }

  /**
   * Remove a connected client from this server and any channels that the client
   * is listening to.
   *
   * @param id - See Client#id.
   */
  public disconnectClient(id: number): void {
    const client = this.clients.get(id);
    if (client === undefined) {
      return;
    }

    client.disconnectFromAllChannels();

    // Check if the client is already closed. If this is not checked, then the
    // server will crash.
    if (!client.socket.isClosed) {
      client.socket.close(1000);
    }

    this.clients.delete(client.id);
  }

  /**
   * Get all clients connected to this server.
   *
   * @returns An array of client IDs.
   */
  public getClients(): number[] {
    const clients = [];
    for (const id of this.clients.keys()) {
      clients.push(+id);
    }
    return clients;
  }

  /**
   * Get all channels in this server.
   *
   * @returns An array of channel names.
   */
  public getChannels(): string[] {
    const channels = [];
    for (const channelName of this.channels.keys()) {
      // Ignore the reserved channels
      if (RESERVED_EVENT_NAMES.indexOf(channelName) !== -1) {
        continue;
      }
      channels.push(channelName);
    }
    return channels;
  }

  /**
   * Do the following:
   *
   *     1. Create a channel (if it does not already exist).
   *     2. Add a callback to that channel. This callback will be executed when
   *        events are sent to the channel.
   *     3. Store the callback in the list of callbacks that the channel has.
   *
   * @param name - The name of the channel.
   * @param cb - See OnChannelCallback in the `types.ts` file.
   */
  public on<T>(
    channelName: string,
    cb: OnChannelCallback<T>,
  ): void {
    let channel = this.channels.get(channelName);
    if (!channel) {
      // If we ended up here, then that means the channel doesn't exist, so we
      // create it
      channel = new Channel(channelName);
      this.channels.set(channelName, channel);
    }

    // Ensure this channel has the callback that the user specifies
    channel.callbacks.push(cb);
  }

  /**
   * Run this server using the WS protocol.
   *
   * @param options - See HTTPOptions.
   *
   * @returns A Promise of DenoServer.
   */
  public runWs(options: HTTPOptions): DenoServer {
    this.handleServerOptions(options);

    this.deno_server = serve(options);

    this.createReservedChannels();

    this.listenForConnections();

    return this.deno_server;
  }

  /**
   * Run this server using the WSS protocol.
   *
   * @param options - See HTTPOptions.
   *
   * @returns A Promise of the DenoServer.
   */
  public runWss(options: HTTPSOptions): DenoServer {
    this.handleServerOptions(options);

    this.deno_server = serveTLS(options);

    this.createReservedChannels();

    this.listenForConnections();

    return this.deno_server;
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PROTECTED /////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Create channels that are reserved for internal purposes.
   */
  protected createReservedChannels(): void {
    this.channels.set("connect", new Channel("connect"));
    this.channels.set("disconnect", new Channel("disconnect"));
  }

  /**
   * See EventEmitter.eventHandler().
   */
  protected eventHandler(_event: Event): void {
    return;
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
   * Handle a reserved event sent from the client.
   *
   * @param client - See Client.
   * @param eventName - The name of the reserved event.
   */
  protected handleReservedEvent(
    client: Client,
    eventName: string,
  ): void {
    switch (eventName) {
      // Occurs when this server tries to connect a client

      // deno-lint-ignore no-case-declarations
      case "connect":
        const connChannel = this.channels.get("connect") as Channel;
        connChannel
          .executeCallbacks(
            new CustomEvent("wocket_reserved", {
              detail: {
                sender: client,
                receiver: connChannel,
                message: `Connected to the server as Client ${client.id}.`,
              },
            }),
          );
        this.listenForClientEvents(client);
        break;

      // Occurs when this server tries to disconnect a client

      // deno-lint-ignore no-case-declarations
      case "disconnect":
        const channel = this.channels.get("disconnect") as Channel;
        channel
          .executeCallbacks(
            new CustomEvent("wocket_reserved", {
              detail: {
                sender: client,
                receiver: this.channels.get("disconnect"),
                messagE: "Disconneted from the server.",
              },
            }),
          );
        this.disconnectClient(client.id);
        break;

      // Occurs when the client sends "id" as the packet

      case "id":
        client.socket.send(`${client.id}`);
        break;

      // Occurs when the client sends "ping" as the packet

      case "ping":
        client.socket.send("pong");
        break;

      // Occurs when the client sends "pong" as the packet

      case "pong":
        client.socket.send("ping");
        break;

      // Occurs when the server tries to reconnect a client

      case "reconnect":
        // TODO(crookse) Do something on an reconnect event. Could be useful to
        // add a flag to this client.
        break;

      // Occurs when the client sends "test" as the packet

      case "test":
        client.socket.send(`Server started on ${this.hostname}:${this.port}.`);
        break;

      default:
        break;
    }
  }

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

  /**
   * Is this event a JSON event? That is, it is a string parsable as JSON.
   *
   * @returns True if yes, false if not.
   */
  protected isEventJson(event: WebSocketEvent): boolean {
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
   * @param client - See Client.
   * @param event - See WebSocketEvent in https://deno.land/std/ws/mod.ts.
   */
  protected handleWebSocketEvent(client: Client, event: WebSocketEvent): void {
    if (typeof event === "string" && RESERVED_EVENT_NAMES.includes(event)) {
      return this.handleReservedEvent(
        client,
        (event as string).trim(),
      );
    }

    if (this.isEventJson(event)) {
      return this.handleEvent(
        client,
        JSON.parse(event as string),
      );
    }

    // if (this.isUnit8ArrayEvent(event)) {
    //   return this.handleEvent(client, event);
    // }

    throw new Error(
      "Could not handle event as Unit8Array, JSON, or Wocket reserved event.",
    );
  }

  /**
   * Handle an event received from a client.
   *
   * @param client - See Client.
   * @param event - See IIncomingEvent.
   */
  protected handleEvent(client: Client, event: IIncomingEvent): void {
    switch (event.action) {
      // Occurs when an event like the following is received from the client:
      //
      //     {
      //       "action": "connect_to_channels",
      //       "payload": ["channel_1", "channel_2"]
      //     }
      //
      case "connect_to_channels":
        (event.payload as string[]).forEach((channel: string) => {
          const channelObj = this.channels.get(channel);
          if (channelObj === undefined) {
            return;
          }
          channelObj.connectClient(client);
          client.connectToChannel(channelObj);
          client.socket.send(
            `You have been connected to the "${channelObj.name}" channel.`,
          );
        });
        break;

      // Occurs when an event like the following is received from the client:
      //
      //     {
      //       "action": "disconnect_from_channels",
      //       "payload": ["channel_1", "channel_2"]
      //     }
      //

      case "disconnect_from_channels":
        (event.payload as string[]).forEach((channel: string) => {
          const c = this.channels.get(channel);
          if (c === undefined) {
            return;
          }
          c.disconnectClient(client);
          client.socket.send(
            `You have been disconnected from the "${channel}" channel.`,
          );
        });
        break;

      // Occurs when an event like the following is received from the client:
      //
      //     {
      //       "action": "send_packet",
      //       "payload": <some unknown type -- can be anything>
      //     }
      //

      // deno-lint-ignore no-case-declarations
      case "send_packet":
        const payload = event.payload as { to: string[]; packet: unknown };
        payload.to.forEach((receiver: string | number) => {
          const receiverObj = this.getReceiverOfEvent(receiver);
          if (receiverObj === undefined) {
            return;
          }
          const result = receiverObj.handlePacket(client, payload.packet);
          if (!result) {
            if (receiverObj instanceof Client) {
              client.socket.send(
                `Failed to send event to Client ${receiverObj.id}.`,
              );
            } else if (receiverObj instanceof Channel) {
              client.socket.send(
                `Failed to send event to "${receiverObj.name}" channel.`,
              );
            }
          }
        });
        break;
    }
  }

  /**
   * Figure out what entity is the receiver of an event.
   *
   * @param receiver - Could be a number (which would mean the receiver is a
   * Client) or a string (which would mean the receiver is a Channel).
   *
   * @returns A Channel or a Client based on the specified argument.
   */
  protected getReceiverOfEvent(
    receiver: string | number,
  ): Channel | Client | undefined {
    const id = +receiver;

    // Not a number? That means the receiver is a channel because all channels
    // are strings and all clients are numbers.
    if (isNaN(id)) {
      return this.channels.get(receiver as string);
    }

    return this.clients.get(id);
  }

  /**
   * Listen for events sent from the client.
   *
   * @param client - See Client.
   */
  protected async listenForClientEvents(client: Client): Promise<void> {
    for await (const webSocketEvent of client.socket) {
      try {
        this.handleWebSocketEvent(client, webSocketEvent);
      } catch (error) {
        // Something must have happened to the client's connection on the
        // client's side if block executes
        if (client.socket.isClosed) {
          this.handleReservedEvent(client, "disconnect");
          continue;
        }

        try {
          client.socket.send(error.stack ?? error.message);
        } catch (_error) {
          client.socket.send(
            "An unknown error occurred while trying to handle the event.",
          );
        }
      }
    }
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
}
