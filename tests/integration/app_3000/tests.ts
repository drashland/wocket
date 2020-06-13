import { SocketServer } from "../../../mod.ts";
import { assertEquals, connectWebSocket } from "../../../deps.ts";

const server = new SocketServer();
server.run({
  hostname: "localhost",
  port: 3000,
});
console.log(`Server listening: http://${server.hostname}:${server.port}`);
console.log(
  "\nIntegration tests: testing different resources can be made and targeted.\n",
);

server
  .createChannel("Channel 1")
  .onMessage((incomingMessage: any) => {
    const { message } = incomingMessage;
    server.getChannel("Channel 1").messages.push({ ...message });
    server.to("Channel 1", incomingMessage);
  });

Deno.test("connection and disconnect channels should exist", () => {
  assertEquals("connection", server.getChannel("connection").name);
  assertEquals("disconnect", server.getChannel("disconnect").name);
});

Deno.test("Channel 1 should exist", () => {
  assertEquals("Channel 1", server.getChannel("Channel 1").name);
});

Deno.test("Channel 2 should exist", () => {
  server.on("Channel 2", () => {
    console.log("woot woot");
  });
  assertEquals("Channel 2", server.getChannel("Channel 2").name);
});

Deno.test("Channel 2 should be closed", () => {
  server.closeChannel("Channel 2");
  assertEquals(undefined, server.getChannel("Channel 2"));
});


Deno.test({
  name: "Stop the server",
  async fn() {
    await server.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

