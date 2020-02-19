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
        const clientId = "Socket rid #" + socket.conn.rid;
        console.log(clientId + " connected.");
        this.clients.push(socket);
        const it = socket.receive();
        while (true) {
          try {
            const { done, value } = await it.next();
            if (done) {
              let clients = [];
              this.clients.forEach(async (client,index) => {
                if (socket == client) {
                  await socket.close(1000).catch(console.error);
                  return;
                }
                clients.push(client);
              });
              this.clients = clients;
              break;
            }
            const ev = value;
            if (typeof ev === "string") {
              // text message
              console.log(clientId + ":", ev);
              for await (let client of this.clients) {
                if (socket !== client) await client.send(ev);
              }
            } else if (ev instanceof Uint8Array) {
              // binary message
              console.log("Binary received:", ev);
            } else if (isWebSocketPingEvent(ev)) {
              const [, body] = ev;
              // ping
              console.log("Ping received:", body);
            } else if (isWebSocketCloseEvent(ev)) {
              // close
              const { code, reason } = ev;
              console.log("Close:", code, reason);
            }
          } catch (e) {
            console.error(`Failed to receive frame: ${e}`);
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
