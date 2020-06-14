import { SocketServer } from "../../../mod.ts";
import { Drash } from "../test_deps.ts";
import { assert, assertEquals, connectWebSocket } from "../../../deps.ts";

let storage: any = {
  "Channel 1": {
    messages: []
  },
  "Channel 2": {
    messages: []
  }
};

class Resource extends Drash.Http.Resource {
  static paths = ["/"];
  protected messages: any = {};
  public async POST() {
    const channel = this.request.getBodyParam("channel");
    const message = this.request.getBodyParam("message");
    const socketClient = await connectWebSocket(`ws://${socketServer.hostname}:${socketServer.port}`);
    let encoded = new TextEncoder().encode(JSON.stringify({[channel]: message}));
    await socketClient.send(encoded);
    socketClient.close();
    return this.response;
  }
}

const webServer = new Drash.Http.Server({
  resources: [
    Resource,
  ],
});

webServer.run({
  hostname: "localhost",
  port: 3001,
});
console.log(`Web server started on ${webServer.hostname}:${webServer.port}`);

const socketServer = new SocketServer();
socketServer.run({
  hostname: "localhost",
  port: 3000,
});
console.log(`socketServer listening: http://${socketServer.hostname}:${socketServer.port}`);
console.log(
  "\nIntegration tests: testing different resources can be made and targeted.\n",
);

// Set up the events

socketServer
  .createChannel("Channel 1")
  .on("Channel 1", ((packet: any) => {
    storage["Channel 1"].messages.push(packet.message);
  }));

socketServer
  .createChannel("Channel 2")
  .on("Channel 2", ((packet: any) => {
    storage["Channel 2"].messages.push(packet.message);
  }));

Deno.test("Channel 1 should exist", () => {
  assertEquals("Channel 1", socketServer.getChannel("Channel 1").name);
});

Deno.test("Channel 2 should exist", () => {
  assertEquals("Channel 2", socketServer.getChannel("Channel 2").name);
});

Deno.test("Channel 2 should be closed", () => {
  socketServer.closeChannel("Channel 2");
  assertEquals(undefined, socketServer.getChannel("Channel 2"));
});

Deno.test("Channel 2 should exist again", () => {
  socketServer.createChannel("Channel 2");
  assertEquals("Channel 2", socketServer.getChannel("Channel 2").name);
});

Deno.test("Channel 1 should have 1 message", async () => {
  await sendMessage("Channel 1", "This is a Channel 1 message.");
  assertEquals(
    storage["Channel 1"].messages,
    [
      "This is a Channel 1 message."
    ]
  );
});

Deno.test("Channel 1 should have 2 messages", async () => {
  await sendMessage("Channel 1", "This is a Channel 1 message #2.");
  assertEquals(
    storage["Channel 1"].messages,
    [
      "This is a Channel 1 message.",
      "This is a Channel 1 message #2.",
    ]
  );
});

Deno.test("Channel 2 should have 1 message", async () => {
  await sendMessage("Channel 2", "This is a Channel 2 message.");
  assertEquals(
    storage["Channel 2"].messages,
    [
      "This is a Channel 2 message.",
    ]
  );
});

Deno.test({
  name: "Stop the server",
  async fn() {
    await webServer.close();
    await socketServer.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

async function sendMessage(channel: string, message: string) {
  const response = await fetch("http://localhost:3001", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      channel,
      message
    })
  });
  await response.text();
}
