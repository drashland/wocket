import { Channel, Server } from "../../mod.ts";
import { Rhum } from "../deps.ts";
import { serve } from "../../deps.ts";
import { deferred } from "../deps.ts";
import { Client } from "../../src/client.ts";

Rhum.testPlan("unit/server_test.ts", () => {
  Rhum.testSuite("constructor()", () => {
    Rhum.testCase("should connect to 3000 if port is not provided", () => {
      const expect = 1557;
      const server = new Server();
      Rhum.asserts.assertEquals(server.port, expect);
    });
    Rhum.testCase(
      "should connect to localhost if hostname is not provided",
      () => {
        const expect = "0.0.0.0";
        const server = new Server();
        Rhum.asserts.assertEquals(server.hostname, expect);
      },
    );
  });
  Rhum.testSuite("close()", () => {
    Rhum.testCase("Should close the deno server", async () => {
      const server = new Server();
      server.deno_server = serve({ port: 8000 });
      server.close();
      for await (const _req of server.deno_server) {
        // If server is closed, this for loop should be skipped. If server was not closed, this loop will be executed and will hang indefinitely
      }
    });
    Rhum.testCase(
      "Should not error if server is not set or not defined",
      () => {
        const server = new Server();
        server.close();
      },
    );
    Rhum.testCase("Should not error if server is already closed", () => {
      const server = new Server();
      server.deno_server = serve({ port: 8000 });
      server.close();
      server.close();
    });
  });

  Rhum.testSuite("closeChannel()", () => {
    Rhum.testCase("Should close and delete a channel by name", () => {
      const server = new Server();
      const channel = new Channel("my channel");
      server.channels.set("my channel", channel);
      server.closeChannel("my channel");
      Rhum.asserts.assertEquals(server.channels.get("my channel"), undefined);
    });
  });

  Rhum.testSuite("disconnectClient()", () => {
    Rhum.testCase(
      "Will destroy any data retaining to the client id",
      async () => {
        const server = new Server();
        await server.runWs({
          port: 1234,
        });

        const client = new WebSocket("ws://127.0.0.1:1234");
        const p = deferred();
        client.onopen = () => p.resolve();
        await p;

        const iter = server.clients.keys();
        const id = iter.next().value;
        server.disconnectClient(id);

        // assert client is no longer set in server
        const serverClient = server.clients.get(id);
        Rhum.asserts.assertEquals(serverClient, undefined);

        // cleanup
        const p2 = deferred();
        client.onclose = () => p2.resolve();
        await p2; // dont close her,e because the server does it
        server.close();
      },
    );
  });

  Rhum.testSuite("getClients()", () => {
    Rhum.testCase("Returns all connected client ids", () => {
      const server = new Server();
      server.clients.set(69, "hi:)" as unknown as Client);
      const clients = server.getClients();
      Rhum.asserts.assertEquals(clients, [69]);
    });
  });

  Rhum.testSuite("getChannels()", () => {
    Rhum.testCase(
      "Returns all set channels but not reserved event names",
      () => {
        const server = new Server();
        server.channels.set("dd", "s" as unknown as Channel);
        const channels = server.getChannels();
        Rhum.asserts.assertEquals(channels, ["dd"]);
      },
    );
  });

  Rhum.testSuite("on()", () => {
    Rhum.testCase("Registers callbacks for the name", () => {
      const server = new Server();
      let yes = false;
      let no = true;
      server.on("$1000", () => {
        yes = true;
      });
      server.on("$1000", () => {
        no = false;
      });
      const channel = server.channels.get("$1000") as Channel; // this should be set now
      const cbs = channel.callbacks;
      Rhum.asserts.assertEquals(cbs.length, 2);
      cbs[0]("" as unknown as CustomEvent);
      cbs[1]("" as unknown as CustomEvent);
      Rhum.asserts.assertEquals(yes, true);
      Rhum.asserts.assertEquals(no, false);
    });
  });

  Rhum.testSuite("runWs()", () => {
  });

  Rhum.testCase("runWss()", () => {
  });
});

Rhum.run();
