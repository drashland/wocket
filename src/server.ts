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
import {
  EventEmitter
} from "./event_emitter.ts";
import {
  ITransmitterOptions
} from "./interfaces.ts";
import {
  Transmitter,
} from "./transmitter.ts";

// TODO(sara) Add description
export class SocketServer extends EventEmitter {
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
  public hostname: string = "localhost";

  /**
   * A property to hold the port this server listens on.
   */
  public port: number = 1557;

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
   * @param transmitterOptions - See ITransmitterOptions
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
   * @param options - See HTTPOptions
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
   * @param options - See HTTPOptions
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
          super.addClient(clientId, socket);

          try {
            for await (const ev of socket) {
              if (ev instanceof Uint8Array) {
                await this.transmitter.checkEvent(ev, clientId);
              } else if (isWebSocketCloseEvent(ev)) {
                await super.removeClient(clientId);
              }
            }
          } catch (e) {
            if (!socket.isClosed) {
              await socket.close(1000).catch(console.error);
              await super.removeClient(clientId);
            }
          }
        })
        .catch((err: Error): void => {
          console.error(`failed to accept websocket: ${err}`);
        });
    }
  }
}
