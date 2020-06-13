import {
  DenoServer,
  HTTPOptions,
  WebSocket,
  acceptWebSocket,
  isWebSocketCloseEvent,
  serve,
} from "../deps.ts";
import EventEmitter from "./event_emitter.ts";

export default class SocketServer extends EventEmitter {
  public deno_server: any;
  public hostname: string = "localhost";
  public port: number = 1557;

  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////

  constructor() {
    super();
  }

  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////

  /**
   * @description
   *     Close the server.
   */
  public close(): void {
    this.deno_server.close();
  }

  /**
   * @description
   *    Handles websocket connection.
   *    After a successful connection, the client will be added to EventEmitter.clients
   *    and the server will start listening to events.
   */
  public async run(options: HTTPOptions): Promise<DenoServer> {
    if (options.hostname) {
      this.hostname = options.hostname;
    }

    if (options.port) {
      this.port = options.port;
    }

    this.deno_server = serve(`${this.hostname}:${this.port}`);

    this.on("connection", () => {
      console.log("A user connected.");
    });

    this.on("disconnect", () => {
      console.log("A user disconnected.");
    });

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
