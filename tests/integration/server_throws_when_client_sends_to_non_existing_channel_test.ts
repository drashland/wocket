import { Server } from "../../mod.ts";
import { assertEquals, deferred } from "../deps.ts";
import { WebSocketClient } from "../../src/websocket_client.ts";

Deno.test("Server throws when client sends a message to a channel that doesn't exist", async () => {
  const server = new Server({
    hostname: "localhost",
    port: 1447,
    protocol: "ws",
  });
  server.run();
  const msgPromise = deferred<MessageEvent>();

  const client = new WebSocketClient(server.address);
  client.onmessage = (e) => msgPromise.resolve(e);
  const p = deferred();
  client.onopen = () => p.resolve();
  await p;
  client.to("usersssss", "hello");
  const msg = await msgPromise;
  const p2 = deferred();
  client.onclose = () => p2.resolve();
  client.close();
  await p2;
  await server.close();
  assertEquals(
    msg.data,
    `The channel "usersssss" doesn't exist as the server hasn't created a listener for it`,
  );
});
