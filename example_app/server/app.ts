import { Drash, SocketServer } from "../deps.ts";
import config from "../config.ts";

import ioServer from "./io_server.ts";
import ChatResource from "./chat_resource.ts";

let server = new Drash.Http.Server({
  response_output: "text/html",
  memory_allocation: {
    multipart_form_data: 128
  },
  directory: config.directory,
  static_paths: config.staticPaths,
  resources: [ChatResource]
});

const io = new ioServer(SocketServer);
export { io };

server.run({
  hostname: config.hostname,
  port: config.port,
});

console.log(`Drash server started on ${config.hostname}:${config.port}`);
