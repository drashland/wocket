import {
  DenoServer,
  HTTPOptions,
  HTTPSOptions,
  WebSocket,
  acceptWebSocket,
  isWebSocketCloseEvent,
  serve,
  serveTLS,
} from "../deps.ts";
import { Client } from "./client.ts";
import { EventEmitter } from "./event_emitter.ts";
import { ITransmitterOptions } from "./interfaces.ts";
import { Packet } from "./packet.ts";
import { Transmitter } from "./transmitter.ts";

/**
 * The `SocketServer` class is responsible for creating a users
 * socket server. Similar to how Drash.Http.Server creates a
 * server instance
 */
export class Server extends EventEmitter {
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
  public transmitter: Transmitter;

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
    this.transmitter = new Transmitter(this, transmitterOptions);
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Close the server.
   */
  public close(): void {
    this.deno_server!.close();
  }

  /**
   * Handles websocket connection.  After a successful connection, the client
   * will be added to EventEmitter.clients and the server will start listening
   * to events.
   *
   * @param options - See HTTPOptions.
   *
   * @returns A Promise of DenoServer.
   */
  public async run(options: HTTPOptions): Promise<DenoServer> {
    if (options.hostname) {
      this.hostname = options.hostname;
    }

    if (options.port) {
      this.port = options.port;
    }

    this.deno_server = serve(options);

    this.acceptWebSockets();

    return this.deno_server!;
  }

  /**
   * Handles websocket secure connection. After a successful connection, the
   * client will be added to EventEmitter.clients and the server will start
   * listening to events.
   *
   * @param options - See HTTPOptions.
   *
   * @returns A Promise of the DenoServer.
   */
  public async runTLS(options: HTTPSOptions): Promise<DenoServer> {
    if (options.hostname) {
      this.hostname = options.hostname;
    }

    if (options.port) {
      this.port = options.port;
    }

    this.deno_server = serveTLS(options);

    this.acceptWebSockets();

    return this.deno_server!;
  }

  /**
   * Accept incoming web sockets as clients.
   */
  protected async acceptWebSockets() {
    for await (const req of this.deno_server!) {
      const { conn, r: bufReader, w: bufWriter, headers } = req;

      acceptWebSocket({
        conn,
        headers,
        bufReader,
        bufWriter,
      })
        .then(async (socket: WebSocket): Promise<void> => {
          const clientId = conn.rid;
          const client = super.createClient(clientId, socket);
          try {
            for await (const message of socket) {
              // Handle binary
              if (message instanceof Uint8Array) {
                this.handleMessageAsBinary(client, message);

                // Handle strings
              } else if (typeof message === "string") {
                await this.handleMessageAsString(client, message);

                // Handle disconnects
              } else if (isWebSocketCloseEvent(message)) {
                super.removeClient(client.id);
              }
            }
          } catch (e) {
            if (!socket.isClosed) {
              await socket.close(1000).catch(console.error);
              super.removeClient(client.id);
            }
          }
        })
        .catch((err: Error): void => {
          console.error(`failed to accept websocket: ${err}`);
        });
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PROTECTED /////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Handle a binary message sent by the socket client.
   *
   * @param client - The client instance.
   * @param message - The message the client sent.
   */
  protected async handleMessageAsBinary(client: Client, message: Uint8Array) {
    const decoded = JSON.parse(new TextDecoder().decode(message));
    const packet = new Packet(client, decoded.to, decoded.message);
    return await this.transmitter.handlePacket(packet);
  }

  /**
   * Handle a string message sent by the socket client.
   *
   * @param client - The client instance.
   * @param message - The message the client sent.
   */
  protected async handleMessageAsString(
    client: Client,
    message: string,
  ): Promise<void> {
    switch (message) {
      case "id":
        return client.socket.send(`Client ID: ${client.id}`);

      case "ping":
        return client.socket.send("pong");

      case "pong":
        return client.socket.send("ping");

      case "test":
        return client.socket.send(
          `Server started on ${this.hostname}:${this.port}.`,
        );

      // If the message isn't any of the above, then it we expect the message
      // to be a JSON string.

      default:
        return await this.handleMessageAsJsonString(client, message);
    }
  }

  /**
   * Handle a message in the format of a JSON string.
   *
   * @param client - The client instance.
   * @param message - The message the client sent.
   */
  protected async handleMessageAsJsonString(
    client: Client,
    message: string,
  ): Promise<void> {
    try {
      const json = JSON.parse(message);

      // A send_packet message should be in the following format:
      //
      //     {
      //       "send_packet": {
      //         "to": ["array", "of", "channels"],
      //         "message": "the message"
      //       }
      //     }
      //
      if (json.send_packet) {
        const packet = new Packet(
          client,
          json.send_packet.to,
          json.send_packet.message,
        );
        return await this.transmitter.handlePacket(packet);
      }

      // A connect_to message should be in the following format:
      //
      //     {
      //       "connect_to": [
      //         "array", "of", "channels"
      //       ]
      //     }
      //
      if (json.connect_to) {
        json.connect_to.forEach((channelName: string) => {
          try {
            super.addClientToChannel(channelName, client.id);
            client.socket.send(`Connected to ${channelName}.`);
          } catch (error) {
            client.socket.send(error.message);
          }
        });
        return;
      }

      // A disconnect_from message should be in the following format:
      //
      //     {
      //       "disconnect_from": [
      //         "array", "of", "channels"
      //       ]
      //     }
      //
      if (json.disconnect_from) {
        json.disconnect_from.forEach((channelName: string) => {
          try {
            super.removeClientFromChannel(channelName, client.id);
            client.socket.send(`Disconnected from ${channelName}.`);
          } catch (error) {
            client.socket.send(error.message);
          }
        });
        return;
      }

      // A open_channel message should be in the following format:
      //
      //     {
      //       "open_channel": "channel name"
      //     }
      //
      if (json.open_channel) {
        try {
          super.openChannel(json.open_channel.channel_name);
          client.socket.send(
            `Opened channel: ${json.open_channel.channel_name}.`,
          );
        } catch (error) {
          client.socket.send(error.message);
        }
        return;
      }

      // A close_channel message should be in the following format:
      //
      //     {
      //       "close_channel": "channel name"
      //     }
      //
      if (json.close_channel) {
        try {
          super.closeChannel(json.close_channel.channel_name);
          client.socket.send(
            `Closed channel: ${json.close_channel.channel_name}.`,
          );
        } catch (error) {
          client.socket.send(error.message);
        }
        return;
      }
    } catch (error) {
      client.socket.send(error.message);
    }
  }
}
