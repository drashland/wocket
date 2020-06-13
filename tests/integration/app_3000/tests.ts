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

Deno.test("Channel 1 should exist", () => {
  const channel = server.getChannel("Channel 1");
  assertEquals("Channel 1", channel.name);
});


Deno.test({
  name: "Stop the server",
  async fn() {
    await server.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

