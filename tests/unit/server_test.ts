import { Channel, Server } from "../../mod.ts";
import { Rhum } from "../deps.ts";
import { deferred } from "../deps.ts";
import { Client } from "../../src/client.ts";
import { assertEquals } from "../deps.ts";

Rhum.testPlan("unit/server_test.ts", () => {
  Rhum.testSuite("close()", () => {
    Rhum.testCase("Should close the server", async () => {
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
      // const client2 = new WebSocket(server.address)
      // const p3 = deferred()
      // client2.onerror = () => p3.resolve()
      // await p3
    });
    Rhum.testCase(
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
    Rhum.testCase("Should not error if server is already closed", async () => {
      const server = new Server({
        hostname: "localhost",
        port: 1337,
        protocol: "ws",
      });
      await server.close();
      await server.close();
    });
  });

  Rhum.testSuite("on()", () => {
    Rhum.testCase("Registers callbacks for the name", () => {
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
      Rhum.asserts.assertEquals(yes, true);
    });

    Rhum.testCase("Type checks pass when using generics for channels", () => {
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
        e.detail.name;
      });
    });
  });

  Rhum.testSuite("to()", () => {
    Rhum.testCase("Should send a message to all clienta", async () => {
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
    Rhum.testCase("Should send a message to a specific client", async () => {
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

  Rhum.testSuite("broadcast()", () => {
  });

  Rhum.testSuite("run()", () => {
    Rhum.testCase("Runs the server", async () => {
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
});

Rhum.run();
