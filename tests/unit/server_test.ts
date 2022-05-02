import { Channel, Server } from "../../mod.ts";
import { Client } from "../../src/client.ts";
import { assertEquals, deferred } from "../deps.ts";

Deno.test("close()", async (t) => {
  await t.step("Should close the server", async () => {
    const server = new Server({
      hostname: "localhost",
      port: 1337,
      protocol: "ws",
    });
    server.run();
    const client = new WebSocket(server.address);
    const p = deferred();
    client.onopen = () => p.resolve();
    await p;
    const p2 = deferred();
    client.onclose = () => p2.resolve();
    client.close();
    await p2;
    await server.close();
  });
  await t.step(
    "Should not error if server is not set or not defined",
    async () => {
      const server = new Server({
        hostname: "localhost",
        port: 1337,
        protocol: "ws",
      });
      await server.close();
    },
  );
  await t.step("Should not error if server is already closed", async () => {
    const server = new Server({
      hostname: "localhost",
      port: 1337,
      protocol: "ws",
    });
    await server.close();
    await server.close();
  });
});
Deno.test("uuid", async (t) => {
  await t.step("Should set the uuid on the clients", () => {
    const server = new Server({
      hostname: "localhost",
      port: 1337,
      protocol: "ws",
    });
    server.clients.set(1, new Client(1, null as unknown as WebSocket));
    let client = server.clients.get(1) as Client;
    client.uuid = "hello world";
    client = server.clients.get(1) as Client;
    assertEquals(client.uuid, "hello world");
  });
});

Deno.test("on()", async (t) => {
  await t.step("Registers callbacks for the name", () => {
    const server = new Server({
      hostname: "localhost",
      port: 1337,
      protocol: "ws",
    });
    let yes = false;
    server.on("$1000", () => {
      yes = true;
    });
    const channel = server.channels.get("$1000") as Channel; // this should be set now
    const cb = channel.callback;
    cb("" as unknown as CustomEvent);
    assertEquals(yes, true);
  });

  await t.step("Type checks pass when using generics for channels", () => {
    const server = new Server({
      hostname: "localhost",
      port: 1337,
      protocol: "ws",
    });
    server.on("connect", (e) => {
      e.detail.id.toPrecision();
    });
    server.on("disconnect", (e) => {
      e.detail.id.toPrecision();
      e.detail.code.toPrecision();
      e.detail.reason.replace("", "");
    });
    server.on<{
      name: string;
    }>("custom-channel", (e) => {
      e.detail.id;
      e.detail.packet.name;
    });
  });
});

Deno.test("to()", async (t) => {
  await t.step("Should send a message to all clienta", async () => {
    const server = new Server({
      hostname: "localhost",
      port: 1337,
      protocol: "ws",
    });
    server.run();
    let message1 = "";
    const socket1 = {
      send: (msg: string) => {
        message1 = msg;
      },
    } as unknown as WebSocket;
    let message2 = "";
    const socket2 = {
      send: (msg: string) => {
        message2 = msg;
      },
    } as unknown as WebSocket;
    const client1 = new Client(10, socket1);
    const client2 = new Client(11, socket2);
    server.clients.set(10, client1);
    server.clients.set(11, client2);
    server.to("test channel", {
      message: "from test",
    });
    await server.close();
    assertEquals(
      message1,
      '{"channel":"test channel","message":{"message":"from test"}}',
    );
    assertEquals(
      message2,
      '{"channel":"test channel","message":{"message":"from test"}}',
    );
  });
  await t.step("Should send a message to a specific client", async () => {
    const server = new Server({
      hostname: "localhost",
      port: 1337,
      protocol: "ws",
    });
    server.run();
    let message1 = "";
    const socket1 = {
      send: (msg: string) => {
        message1 = msg;
      },
    } as unknown as WebSocket;
    let message2 = "";
    const socket2 = {
      send: (msg: string) => {
        message2 = msg;
      },
    } as unknown as WebSocket;
    const client1 = new Client(10, socket1);
    const client2 = new Client(11, socket2);
    server.clients.set(10, client1);
    server.clients.set(11, client2);
    server.to("test channel", {
      message: "from test",
    }, 11);
    await server.close();
    assertEquals(message1, "");
    assertEquals(
      message2,
      '{"channel":"test channel","message":{"message":"from test"}}',
    );
  });
});

Deno.test("run()", async (t) => {
  await t.step("Runs the server", async () => {
    const server = new Server({
      hostname: "localhost",
      port: 1337,
      protocol: "ws",
    });
    server.run();
    const client = new WebSocket(server.address);
    const p = deferred();
    client.onopen = () => p.resolve();
    await p;
    const p2 = deferred();
    client.onclose = () => p2.resolve();
    client.close();
    await p2;
    await server.close();
  });
});

Deno.test("searchParams", async (t) => {
  await t.step("Should set the search params", async () => {
    const server = new Server({
      hostname: "localhost",
      port: 1337,
      protocol: "ws",
    });
    const connected = deferred<URLSearchParams>();
    server.on("connect", (e) => {
      connected.resolve(e.detail.queryParams);
    });
    server.run();
    const client = new WebSocket(server.address + "?name=edward");
    const p = deferred();
    client.onopen = () => p.resolve();
    await p;
    const queryParams = await connected;
    const p2 = deferred();
    client.onclose = () => p2.resolve();
    client.close();
    await p2;
    await server.close();
    assertEquals(queryParams.get("name"), "edward");
  });
});
