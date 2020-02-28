import { serve } from "../../deps.ts";
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  WebSocket,
} from "../../deps.ts";
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

  public async connect() {
    const server = serve(`${this.config.address}:${this.config.port}`);

    for await (const req of server) {
      const { headers, conn } = req;
      acceptWebSocket({
        conn,
        headers,
        bufReader: req.r,
        bufWriter: req.w
      })
      .then(async (socket: WebSocket): Promise<void> => {
        const clientId = conn.rid;
        super.addClient(socket, clientId);
        const it = socket.receive();
        while (true) {
          try {
            const { done, value } = await it.next();
            if (done) {
              await super.removeClient(clientId);
              break;
            };
            const ev = value;

            if (ev instanceof Uint8Array) {
              await super.checkEvent(ev, clientId);
            } else if (isWebSocketCloseEvent(ev)) {
              const { code, reason } = ev;
              console.log("ws:Close", code, reason);
            }
          } catch (e) {
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
