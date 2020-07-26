import { Packet, Server } from "../../../mod.ts";
import { Rhum, WebSocket, connectWebSocket, serve } from "../../deps.ts";
const decoder = new TextDecoder();

////////////////////////////////////////////////////////////////////////////////
// SERVER SETUP ////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

const server = new Server({ reconnect: false });

await server.run({
  hostname: "127.0.0.1",
  port: 3000,
});

console.log(
  `Server listening: http://${server.hostname}:${server.port}`,
);

let storage: any = {
  chan1: [],
  chan2: [],
  connected: [],
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

let client: WebSocket | null = null;

// Create a basic raw Deno web server. This web server will take in HTTP
// requests and make calls to the socket server based on what is passed in the
// body of the HTTP request. For example, if {"connect_to": ["chan1"]} was
// passed in the body of the request, then the web server will pass that
// information to the socket server and the socket server will handle that
// packet accordingly.
const webServer = serve({ hostname: "localhost", port: 3001 });
(async () => {
  for await (const req of webServer) {
    const packet =
      JSON.parse(decoder.decode(await Deno.readAll(req.body))).data;
    if (!client) {
      client = await connectWebSocket(`ws://${server.hostname}:${server.port}`);
    }
    if (packet) {
      await client.send(JSON.stringify(packet));
    }
    req.respond({});
  }
})();

console.log(
  `Web server listening: http://localhost:3001`,
);

////////////////////////////////////////////////////////////////////////////////
// PERFORM EVENTS TO TEST AGAINST //////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

await sendPacket(JSON.stringify({
  data: {
    connect_to: ["chan1"],
  },
}));

await sendPacket(JSON.stringify({
  data: {
    send_packet: {
      to: "chan1",
      message: "hello",
    },
  },
}));

////////////////////////////////////////////////////////////////////////////////
// TESTS ///////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

console.log(
  "\nIntegration tests: testing different channels can be opened and work.\n",
);

Rhum.testPlan("app_3000", () => {
  Rhum.testSuite("server", () => {
    Rhum.testCase("should allow clients to connect", async () => {
      Rhum.asserts.assertEquals(storage.connected.length, 1);
    });
  });
  Rhum.testSuite("chan1", () => {
    Rhum.testCase("should exist", () => {
      Rhum.asserts.assertEquals(server.getChannel("chan1").name, "chan1");
    });
    Rhum.testCase("should have one message", () => {
      Rhum.asserts.assertEquals(storage.chan1, ["hello"]);
    });
  });
});

Rhum.run();

Deno.test({
  name: "Stop the server",
  async fn() {
    server.close();
    webServer.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

async function sendPacket(packet?: string) {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  const response = await fetch("http://localhost:3001", {
    headers,
    body: packet ?? "",
  });
  await response.text();
}
