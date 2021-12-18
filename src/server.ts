import { StdServer } from "../deps.ts";
import { Channel } from "./channel.ts";
import { Client } from "./client.ts";
import { OnChannelCallback } from "./types.ts";

export interface IOptions {
  /** The hostname to start the websocket server on */
  hostname: string;
  /** The port to start the websocket server on */
  port: number;
  /** Protocol for the server */
  protocol: "ws" | "wss";
  /** Path to the key file if using wss */
  keyFile?: string;
  /** Path to the cert file if using wss */
  certFile?: string;
}

type TRequestHandler = (r: Request) => Promise<Response>;

/**
 * A class to create a websocket server, handling clients connecting,
 * and being able to handle messages from them, and send messages to them
 */
export class Server {
  #options: IOptions;

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
   * Our server instance that is serving the app
   */
  #server!: StdServer;

  /**
   * A promise we need to await after calling close() on #server
   */
  #serverPromise!: Promise<void>;

  //// CONSTRUCTOR /////////////////////////////////////////////////////////////

  /**
   * @param options
   */
  constructor(options: IOptions) {
    this.#options = options;
  }

  /**
   * Get the full address that this server is running on.
   */
  get address(): string {
    return `${this.#options.protocol}://${this.#options.hostname}:${this.#options.port}`;
  }

  //// PUBLIC //////////////////////////////////////////////////////////////////

  /**
   * Broadcast to other clients in a channel excluding the one passed in
   *
   * @param channelName - Channel to send the message to
   * @param message - The message to send
   * @param id - Id of client it ignore (not send the message to)
   *
   * @example
   * ```ts
   * interface SomeEvent { id: number }
   * server.on("some-event", (event: CustomEvent<SomeEvent>) => {
   *   const { id } = event.detail
   *   server.broadcast("some-channel", {
   *     message: "Shh everybody! " + id + " won't be getting this message!"
   *   }, id)
   * })
   * ```
   */
  public broadcast(
    channelName: string,
    message: Record<string, unknown>,
    id: number,
  ) {
    for (const clientId of this.clients.keys()) {
      if (clientId !== id) { // ignore sending to client that has the passed in id
        this.#send(clientId, channelName, message);
      }
    }
  }

  /**
   * Send a message to the channel, so clients listening on that channel
   * will receive this message
   *
   * @param channelName - The channel to send the message to
   * @param message - The message to send
   * @param onlySendTo - Id of a client, if you only wish to send the message to just that client
   */
  public to(
    channelName: string,
    message: Record<string, unknown>,
    onlySendTo?: number,
  ): void {
    // If sending to a specific client, only do that
    if (onlySendTo !== undefined) {
      const id = onlySendTo;
      this.#send(id, channelName, message);
      return;
    }
    // Otherwise send to all clients
    for (const clientId of this.clients.keys()) {
      this.#send(clientId, channelName, message);
    }
  }

  /**
   * Do the following:
   *
   *     1. Create a channel (if it does not already exist).
   *     2. Add a callback to that channel. This callback will be executed when
   *        events are sent to the channel.
   *     3. Store the callback in the list of callbacks that the channel has.
   *
   * @param channelName - The name of the channel.
   * @param cb - See OnChannelCallback in the `types.ts` file.
   */
  public on<T>(
    channelName: string,
    cb: OnChannelCallback<T>,
  ): void {
    const channel = new Channel(channelName, cb); // even if one exists, overwrite it
    this.channels.set(channelName, channel);
  }

  /**
   * Run the sever.
   */
  run(): void {
    this.#server = new StdServer({
      addr: `${this.#options.hostname}:${this.#options.port}`,
      handler: this.#getHandler(),
    });
    if (this.#options.protocol === "ws") {
      this.#serverPromise = this.#server.listenAndServe();
    }
    if (this.#options.protocol === "wss") {
      this.#serverPromise = this.#server.listenAndServeTls(
        this.#options.certFile as string,
        this.#options.keyFile as string,
      );
    }
  }

  /**
   * Close the server, stopping all resources and breaking
   * all connections to clients
   */
  public async close(): Promise<void> {
    try {
      this.#server.close();
      await this.#serverPromise;
    } catch (_e) {
      // Do nothing, the server was probably already closed
    }
  }

  //// PRIVATE /////////////////////////////////////////////////////////////////

  /**
   * Get the request handler for the server.
   *
   * @returns The request handler.
   */
  #getHandler(): TRequestHandler {
    const clients = this.clients;
    const channels = this.channels;

    // deno-lint-ignore require-await
    return async function (r: Request): Promise<Response> {
      const { socket, response } = Deno.upgradeWebSocket(r);

      // Create the client
      const client = new Client(clients.size, socket);
      clients.set(clients.size, client);

      // Call the connect callback if defined by the user
      const channel = channels.get("connect");
      const connectEvent = new CustomEvent("connect", {
        detail: {
          id: client.id,
        },
      });
      if (channel) channel.callback(connectEvent);

      // When the socket calls `.send()`, then do the following
      socket.onmessage = (message: MessageEvent) => {
        try {
          if ("data" in message && typeof message.data === "string") {
            const json = JSON.parse(message.data); // TODO wrap in a try catch, if error throw then send error message to client maybe? ie malformed request
            // Get the channel they want to send the msg to
            const channel = channels.get(json.channel) as Channel; // TODO :: Add check for if channel wasnt found, which just means a user hasn't created a listener for it
            // construct the event
            const customEvent = new CustomEvent(channel.name, {
              detail: {
                ...json.message,
                id: client.id,
              },
            });
            // Call the user defined handler for the channel. Essentially a `server.on("channel", ...)` will be called
            const callback = channel.callback;
            callback(customEvent);
          }
        } catch (error) {
          socket.send(error.message);
        }
      };

      // When the socket calls `.close()`, then do the following
      socket.onclose = (ev: CloseEvent) => {
        // Remove the client
        clients.delete(client.id);
        // Call the disconnect handler if defined
        const { code, reason } = ev;
        const disconnectEvent = new CustomEvent("disconnect", {
          detail: {
            id: client.id,
            code,
            reason,
          },
        });
        const disconnectHandler = channels.get("disconnect");
        if (disconnectHandler) {
          disconnectHandler.callback(disconnectEvent);
        }
      };

      return response;
    };
  }

  #send(
    clientId: number,
    channelName: string,
    message: Record<string, unknown>,
  ) {
    const client = this.clients.get(clientId);
    client!.socket.send(JSON.stringify({
      channel: channelName,
      message: message,
    }));
  }
}
