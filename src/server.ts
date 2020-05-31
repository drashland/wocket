import { serve } from "../deps.ts";
import { acceptWebSocket, isWebSocketCloseEvent, WebSocket } from "../deps.ts";
import EventEmitter  from "./event_emitter.ts";

export default class SocketServer extends EventEmitter {
  private config: any;

  constructor(config: any = {}) {
    super();
    if (!config.address) {
      config.address = "127.0.0.1";
    }
    if (!config.port) {
      config.port = "3000";
    }
    this.config = config;
    this.connect();
  }

  public getConfig() {
    return this.config;
  }

  /**
   * @description
   *    Handles websocket connection.
   *    After a successful connection, the client will be added to EventEmitter.clients
   *    and the server will start listening to events.
   */
  public async connect() {
    const server = serve(`${this.config.address}:${this.config.port}`);

    for await (const req of server) {
      const { conn, r: bufReader, w: bufWriter, headers } = req;

      acceptWebSocket({
        conn,
        headers,
        bufReader,
        bufWriter,
      })
      .then(async (socket: WebSocket): Promise<void> => {
        const clientId = conn.rid;
        super.addClient(socket, clientId);

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
  }
}
