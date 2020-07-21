import { Drash, Server } from "./deps.ts";

import HomeResource from "./src/resources/home_resource.ts";
import ChatResource from "./src/resources/chat_resource.ts";

const webServer = new Drash.Http.Server({
  response_output: "application/json",
  directory: Deno.realPathSync("."),
  static_paths: ["/public"],
  resources: [
    HomeResource,
    ChatResource,
  ],
  template_engine: true,
  views_path: "./src/views",
});

webServer.run({
  hostname: "localhost",
  port: 3001,
});
console.log(
  `Web server started on http://${webServer.hostname}:${webServer.port}`,
);

const server = new Server();
server.run({
  hostname: "localhost",
  port: 3000,
}, {
  reconnect: false,
});
console.log(
  `Socket server started on ws://${server.hostname}:${server.port}`,
);

server.on("connection", () => {
  console.log("A user connected.");
});

server.on("disconnect", () => {
  console.log("A user disconnected.");
});

export {
  server,
};
