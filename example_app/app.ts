import { Drash, SocketServer } from "./deps.ts";

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
console.log(`Web server started on ${webServer.hostname}:${webServer.port}`);

const socketServer = new SocketServer();
socketServer.run({
  hostname: "localhost",
  port: 3000,
});
console.log(
  `Socket server started on ${socketServer.hostname}:${socketServer.port}`,
);

socketServer.on("connection", () => {
  console.log("A user connected.");
});

socketServer.on("disconnect", () => {
  console.log("A user disconnected.");
});

export {
  socketServer,
};
