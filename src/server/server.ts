import { serve } from "../../deps.ts";
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  WebSocket,
} from "../../deps.ts";
import EventEmitter  from "./event_emitter.ts";

export default class SocketServer extends EventEmitter {
  protected configs: any;

  constructor(configs: any = {}) {
    super();
    if (!configs.address) {
      configs.address = "127.0.0.1";
    }
    if (!configs.port) {
      configs.port = "3000";
    }
    this.configs = configs;
    this.connect();
  }

  public async connect() {
    const server = serve(`${this.configs.address}:${this.configs.port}`);

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
              super.removeClient(clientId);
              break;
            };
            const ev = value;

            if (ev instanceof Uint8Array || typeof ev === "string") {
              await super.checkEvent(ev, clientId);
            } else if (isWebSocketCloseEvent(ev)) {
              const { code, reason } = ev;
              console.log("ws:Close", code, reason);
            }
          } catch (e) {
            console.error(`failed to receive frame: ${e}`);
            await socket.close(1000).catch(console.error);
          }
        }
      })
      .catch((err: Error): void => {
        console.error(`failed to accept websocket: ${err}`);
      });
    }
  }
}
