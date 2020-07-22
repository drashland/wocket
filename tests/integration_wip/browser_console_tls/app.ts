import { Packet, Server } from "../../mod.ts";

// Create the socket server
const server = new Server();
server.runTLS({
  hostname: "localhost",
  port: 3000,
  certFile: "./example_apps/browser_console_tls/server.crt",
  keyFile: "./example_apps/browser_console_tls/server.key",
});
console.log(
  `Socket server started on wss://${server.hostname}:${server.port}`,
);

// Listen for connections to the socket server
server.on("connection", () => {
  console.log("A user connected.");
});

// Listen for disconnections from the socket server
server.on("disconnect", () => {
  console.log("A user disconnected.");
});

// Create "Channel 1" so that clients can send messages to it
server.openChannel("Channel 1");

// Ad a Channel 1 packet handler
server.on("Channel 1", (packet: Packet) => {
  console.log(packet);
  console.log("Sending a message back to the client.");
  // Send messages to all clients listening to "Channel 1"
  server.to(
    "Channel 1",
    `Message received! You sent "${packet.message}" as the message.`,
  );
});