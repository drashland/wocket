<<<<<<< HEAD:src/server.ts
import { serve } from "../deps.ts";
import { acceptWebSocket, isWebSocketCloseEvent, WebSocket } from "../deps.ts";
import EventEmitter  from "./event_emitter.ts";
=======
import { serve } from "../../deps.ts";
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  WebSocket,
} from "../../deps.ts";
import EventEmitter from "./event_emitter.ts";
>>>>>>> 1abb15db34a021490695085e67ba72fbe471e2a3:src/server/server.ts

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

  public async connect() {
    const server = serve(`${this.config.address}:${this.config.port}`);

    for await (const req of server) {
<<<<<<< HEAD:src/server.ts
      const { conn, r: bufReader, w: bufWriter, headers } = req;

      acceptWebSocket({
        conn,
        headers,
        bufReader,
        bufWriter,
      })
      .then(async (socket: WebSocket): Promise<void> => {
=======
      const { headers, conn } = req;
      try {
        const socket = await acceptWebSocket({
          conn,
          headers,
          bufReader: req.r,
          bufWriter: req.w,
        });
>>>>>>> 1abb15db34a021490695085e67ba72fbe471e2a3:src/server/server.ts
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
<<<<<<< HEAD:src/server.ts
        } catch (e) {
          if (!socket.isClosed) {
            await socket.close(1000).catch(console.error);
=======
        } catch (err) {
          console.error(`failed to receive frame: ${err}`);

          if (!socket.isClosed) {
>>>>>>> 1abb15db34a021490695085e67ba72fbe471e2a3:src/server/server.ts
            await super.removeClient(clientId);
          }
        }
      } catch (err) {
        console.error(`failed to accept websocket: ${err}`);
        await req.respond({ status: 400 });
      }
    }
  }
}
