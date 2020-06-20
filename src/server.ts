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
import EventEmitter from "./event_emitter.ts";

export default class SocketServer extends EventEmitter {
  /**
   * @description
   *     A property to hold the Deno server. This property is set in this.run()
   *     like so:
   *
   *         this.deno_server = serve();
   *
   * @property DenoServer any
   */
  public deno_server: any;

  /**
   * @description
   *     A property to hold the hostname this server listens on.
   *
   * @property string hostname
   */
  public hostname: string = "localhost";

  /**
   * @description
   *     A property to hold the port this server listens on.
   * @property number port
   */
  public port: number = 1557;

  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   */
  constructor() {
    super();
  }

  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////

  /**
   * @description
   *     Close the server.
   *
   * @return void
   */
  public close(): void {
    this.deno_server.close();
  }

  /**
   * @description
   *    Handles websocket connection.  After a successful connection, the client
   *    will be added to EventEmitter.clients and the server will start
   *    listening to events.
   *
   * @param HTTPOptions options
   *
   * @return Promise<DenoServer>
   */
  public async run(options: HTTPOptions): Promise<DenoServer> {
    if (options.hostname) {
      this.hostname = options.hostname;
    }

    if (options.port) {
      this.port = options.port;
    }

    this.deno_server = serve(options);

    (async () => {
      for await (const req of this.deno_server) {
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
                  await super.checkEvent(ev, clientId);
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
    })();

    return this.deno_server;
  }

  /**
   * @description
   *    Handles websocket secure connection. After a successful connection,
   *    the client will be added to EventEmitter.clients and the server will
   *    start listening to events.
   *
   * @param HTTPOptions options
   *
   * @return Promise<DenoServer>
   */
  public async runTLS(options: HTTPSOptions): Promise<DenoServer> {
    if (options.hostname) {
      this.hostname = options.hostname;
    }

    if (options.port) {
      this.port = options.port;
    }

    this.deno_server = serveTLS(options);

    (async () => {
      for await (const req of this.deno_server) {
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
                  await super.checkEvent(ev, clientId);
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
    })();

    return this.deno_server;
  }
}
