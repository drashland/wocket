import { Packet, Server } from "../../../mod.ts";
import { Rhum, Drash, WebSocket, connectWebSocket } from "../../deps.ts";

////////////////////////////////////////////////////////////////////////////////
// SERVER SETUP ////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

const server = new Server({ reconnect: false });

server.run({
  hostname: "127.0.0.1",
  port: 3000,
});

console.log(
  `Server listening: http://${server.hostname}:${server.port}`,
);

let storage: any = {
  chan1: [],
  chan2: [],
  connected: []
};


// Set up connect channel
server.on("connect", (packet: Packet) => {
  storage.connected.push(packet);
});


// Set up the chan1 channel
server.openChannel("chan1");
server.on("chan1", (packet: Packet) => {
  storage.chan1.push(packet.message);
});

////////////////////////////////////////////////////////////////////////////////
// TESTS ///////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

console.log(
  "\nIntegration tests: testing different channels can be opened and work.\n",
);

const client = await connectWebSocket(`ws://${server.hostname}:${server.port}`);

await client.send(JSON.stringify({
  send_packet: {
    to: "chan1",
    message: "Hello, chan1! This message won't make it through until connected."
  }
}));

await client.send(JSON.stringify({
  connect_to: ["chan1"]
}));

await client.send(JSON.stringify({
  send_packet: {
    to: "chan1",
    message: "Hello, chan1!"
  }
}));

Rhum.testPlan("app_3000", async () => {
  Rhum.testSuite("server", () => {
    Rhum.testCase("should allow clients to connect", async () => {
      Rhum.asserts.assertEquals(storage.connected.length, 1);
    });
  });
  Rhum.testSuite("chan1", () => {
    Rhum.testCase("should exist", () => {
      Rhum.asserts.assertEquals("chan1", server.getChannel("chan1").name);
    });
    Rhum.testCase("should receive messages", async () => {
      Rhum.asserts.assertEquals(storage.chan1, ["Hello, chan1!"]);
    });
  });
});

Rhum.run();

Deno.test({
  name: "Stop the server",
  fn() {
    server.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
