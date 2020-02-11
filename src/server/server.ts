import { serve } from "https://deno.land/std/http/server.ts";
import IOConnection from "./io.ts";

class SocketServer {
  protected configs: any;
  public connections: any = [];

  constructor(configs: any = {}) {
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
    const connection = new IOConnection(server);
    this.connections.push(connection);
  }
}

export default SocketServer;
