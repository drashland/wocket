import Drash from "../deno-drash/mod.ts";

import {
  connectWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  isWebSocketPongEvent
} from "https://deno.land/std/ws/mod.ts";
import { encode } from "https://deno.land/std/strings/mod.ts";
import { BufReader } from "https://deno.land/std/io/bufio.ts";
import { TextProtoReader } from "https://deno.land/std/textproto/mod.ts";
import { blue, green, red, yellow } from "https://deno.land/std/fmt/colors.ts";

class HomeResource extends Drash.Http.Resource {
  static paths = ["/"];
  public async GET() {
    const sock = await connectWebSocket("ws://127.0.0.1:1337");
    sock.send(this.request.getBodyParam("message"));
  }
}


const server = new Drash.Http.Server({
  address: "127.0.0.1:1557",
  resources: [HomeResource]
});

server.run();
