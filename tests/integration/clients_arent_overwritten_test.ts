import { Client, Server } from "../../mod.ts";
import { assertEquals, deferred } from "../deps.ts";
import { WebSocketClient } from "../../src/websocket_client.ts";

Deno.test("If 2 clients, and client 1 leaves, client 2 wont be overwritten", async () => {
  // Say the clients looks like: Map { 1: ..., 2: ... }
  // Client 1 leaves: Map { 2: ... }
  // Before, we did `clients.set(clients.size + 1, ...)`, and as `clients.size` would evaluate
  // to "2", it'd overwrtie the client.
  // Now, we find the *next* available id

  const server = new Server({
    hostname: "localhost",
    port: 1447,
    protocol: "ws",
  });
  server.run();
  server.on("connect", (e) => {
    server.to("connected", {
      yourId: e.detail.id,
    }, e.detail.id);
  });

  const client1IdPromise = deferred<number>();
  const client2IdPromise = deferred<number>();

  const client1 = new WebSocketClient(server.address);
  client1.on<{ yourId: number }>("connected", (e) => {
    const { yourId } = e;
    client1IdPromise.resolve(yourId);
  });

  const client1Id = await client1IdPromise;

  const client2 = new WebSocketClient(server.address);
  client2.on<{ yourId: number }>("connected", (e) => {
    const { yourId } = e;
    client2IdPromise.resolve(yourId);
  });

  const client2Id = await client2IdPromise;

  try {
    assertEquals(client1Id, 1);
    assertEquals(client2Id, 2);
  } catch (e) {
    const p = deferred();
    client1.onclose = () => {
      client2.close();
    };
    client2.onclose = () => {
      p.resolve();
    };
    client1.close();
    await p;
    throw e;
  }

  let p = deferred();
  client1.onclose = () => p.resolve();
  client1.close();
  await p;
  assertEquals(server.clients.size, 1);
  assertEquals(server.clients.get(1), undefined);
  assertEquals(!!server.clients.get(2), true);

  // client3 should have id of 1, client4 should have id of 3
  const client3IdPromise = deferred<number>();
  const client4IdPromise = deferred<number>();
  const client3 = new WebSocketClient(server.address);
  client3.on<{ yourId: number }>("connected", (e) => {
    const { yourId } = e;
    client3IdPromise.resolve(yourId);
  });

  const client3Id = await client3IdPromise;

  const client4 = new WebSocketClient(server.address);
  client4.on<{ yourId: number }>("connected", (e) => {
    const { yourId } = e;
    client4IdPromise.resolve(yourId);
  });

  const client4Id = await client4IdPromise;

  assertEquals(server.clients.size, 3);

  p = deferred();
  client2.onclose = () => client3.close();
  client3.onclose = () => client4.close();
  client4.onclose = () => p.resolve();
  client2.close();
  await p;
  await server.close();

  assertEquals(client3Id, 1), assertEquals(client4Id, 3);
});
