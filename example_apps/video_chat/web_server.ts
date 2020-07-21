import HomeResource from "./resources/home_resource.ts";
import {Drash} from "../chat/deps.ts";

export const webServer = new Drash.Http.Server({
  resources: [HomeResource],
  views_path: "./public/views",
  directory: ".",
  static_paths: ["/public"]
});

await webServer.run({
  hostname: "localhost",
  port: 3000
});

console.log(`Drash web server is running on ${webServer.hostname}:${webServer.port}`)