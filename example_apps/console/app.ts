import { SocketServer } from "../../mod.ts";

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

socketServer
  .createChannel("Channel 1")
  .onMessage((packet: any) => {
    console.log(packet);
    console.log("Sending a message back to the client.");
    socketServer.to(
      "Channel 1",
      `Message received! You sent "${packet.message}" as the message.`,
    );
  });
