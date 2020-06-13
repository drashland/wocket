import { connectWebSocket } from "../../deps.ts";

export default class Client {
  public socket: any;
  constructor(hostname: string, port: number) {
    this.connect(hostname, port);
  }
}
