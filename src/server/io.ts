import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  WebSocket
} from "../../deps.ts";

export default class IOConnection {
  public clients: any = [];
  protected server: any = [];

  constructor(server: any) {
    this.server = server;
    this.attach();
  }

  public async attach() {
    for await (const req of this.server) {
      const { headers, conn } = req;
      acceptWebSocket({
        conn,
        headers,
        bufReader: req.r,
        bufWriter: req.w
      })
      .then(async (socket: WebSocket): Promise<void> => {
        console.log("socket connected!");
        this.clients.push(socket);
        const it = socket.receive();
        while (true) {
          try {
            const { done, value } = await it.next();
            if (done) break;
            const ev = value;
            if (typeof ev === "string") {
              // text message
              console.log("ws:Text", ev);
              for await (let client of this.clients) {
                if (socket !== client) await client.send(ev);
              }
            } else if (ev instanceof Uint8Array) {
              // binary message
              console.log("ws:Binary", ev);
            } else if (isWebSocketPingEvent(ev)) {
              const [, body] = ev;
              // ping
              console.log("ws:Ping", body);
            } else if (isWebSocketCloseEvent(ev)) {
              // close
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
};
