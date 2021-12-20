import { Server } from "../../mod.ts";
import { assertEquals, deferred } from "../deps.ts";
import { WebSocketClient } from "../../src/websocket_client.ts";

Deno.test("Can use paths with the server", async () => {
  const server = new Server({
    hostname: "localhost",
    port: 1447,
    protocol: "ws",
    path: "/my-app/users",
  });
  server.run();

  // client1 should close normally
  const client1 = new WebSocketClient(server.address + "/my-app/users");
  const p1 = deferred<{
    code: number;
    reason: string;
  }>();
  client1.onclose = (e) => {
    p1.resolve({
      code: e.code,
      reason: e.reason,
    });
  };
  client1.close();
  const p1Result = await p1;

  // Client2 should be closed by server
  const client2 = new WebSocketClient(server.address);
  const p2 = deferred<string>();
  // deno-lint-ignore ban-ts-comment
  // @ts-ignore
  client2.onerror = (e) => p2.resolve(e.message);
  const p2Result = await p2;

  await server.close();

  assertEquals(p1Result, {
    code: 0,
    reason: "",
  });
  assertEquals(
    p2Result,
    "NetworkError: failed to connect to WebSocket: HTTP error: 406 Not Acceptable",
  );
});
