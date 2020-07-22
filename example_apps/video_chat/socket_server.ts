import {Server} from "../../src/server.ts";
import {Packet} from "../../mod.ts";

const socketServer = new Server();

await socketServer.run({
  hostname: "localhost",
  port: 3001
});

console.log(`Socket server is running on ${socketServer.hostname}:${socketServer.port}`)

socketServer.on("room", (data: Packet) => {
  console.log("room event")
  console.log(socketServer.clients)
  console.log(socketServer.channels)
})