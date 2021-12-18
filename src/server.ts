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

export interface IJsonMessage {
  client_id?: number;
  channel?: string;
  message: unknown;
}

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
   * A "counter" variable that increments when a client connects to the server.
   * This variable becomes the newly connected client's ID.
   */
  #num_clients = 0;

  /**
   * Our server instance that is serving the app.
   */
  #server!: StdServer;

  /**
   * A promise we need to await after calling close() on #server
   */
  #serverPromise!: Promise<void>;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER  - CONSTRUCTOR ////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

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

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER  - PUBLIC METHODS /////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

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
      handler: async (r: Request) => {
        return await this.#handleRequest(r);
      },
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

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER  - PRIVATE METHODS ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Get the request handler for the server.
   *
   * @returns The request handler.
   */
  async #handleRequest(r: Request): Promise<Response> {
    try {
      const { socket, response } = Deno.upgradeWebSocket(r);

      // Create the client
      const newClientId = this.#getNewClientId();
      const client = new Client(newClientId, socket);
      this.clients.set(newClientId, client);

      // Send the connection message if the user defined one
      const connectEvent = new CustomEvent("connect", {
        detail: {
          id: client.id,
        },
      });
      if (this.channels.has("connect")) {
        this.channels.get("connect")!.callback(connectEvent);
      }

      // When the socket calls `.send()`, then do the following
      socket.onmessage = (message: MessageEvent) => {
        try {
          if ("data" in message && typeof message.data === "string") {
            const json = JSON.parse(message.data) as IJsonMessage;

            // Try sending a message to a channel if that was requested by the
            // sender
            if ("channel" in json && this.channels.has(json.channel!)) {
              try {
                const channel = this.channels.get(json.channel!)!;

                // Construct the event to send to the channel
                const customEvent = new CustomEvent(channel.name, {
                  detail: {
                    message: json.message,
                    sender: client,
                  },
                });

                // Call the user-defined handler for the channel. Essentially
                // a `server.on("channel", ...)` will be called.
                const callback = channel.callback;
                callback(customEvent);
              } catch (error) {
                // Send the error to the client who sent this message
                client.socket.send(error.message);
              }
            }

            // Try sending a message to a client if that was requested by the
            // sender
            if ("client" in json && this.clients.has(json.client_id!)) {
              try {
                const client = this.clients.get(json.client_id!)!;

                // Construct the event to send to the channel
                const message = {
                  message: json.message,
                  sender: client,
                };

                client.socket.send(JSON.stringify(message));
              } catch (error) {
                // Send the error to the client who sent this message
                client.socket.send(error.message);
              }
            }
          }
        } catch (error) {
          socket.send(error.message);
        }
      };

      // When the socket calls `.close()`, then do the following
      socket.onclose = (ev: CloseEvent) => {
        // Remove the client
        this.clients.delete(client.id);
        // Call the disconnect handler if defined
        const { code, reason } = ev;
        const disconnectEvent = new CustomEvent("disconnect", {
          detail: {
            id: client.id,
            code,
            reason,
          },
        });
        const disconnectHandler = this.channels.get("disconnect");
        if (disconnectHandler) {
          disconnectHandler.callback(disconnectEvent);
        }
      };

      return response;
    } catch (error) {
      console.log(error);
    }

    return new Response();
  }

  #getNewClientId(): number {
    this.#num_clients += 1;
    return this.#num_clients;
  }

  /**
   * Send a message to the given client.
   *
   * @param clientId - The ID of the client receiving the message.
   * @param channelName
   */
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
