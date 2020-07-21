import {Server} from "../../src/server.ts";

const socketServer = new Server();

await socketServer.run({
  hostname: "localhost",
  port: 3001
});

console.log(`Socket server is running on ${socketServer.hostname}:${socketServer.port}`)