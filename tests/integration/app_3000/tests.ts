import { Server } from "../../../mod.ts";
import { Drash, assertEquals, connectWebSocket, WebSocketMessage } from "../../deps.ts";

let storage: any = {
  "chan1": {
    messages: [],
  },
  "chan2": {
    messages: [],
  },
};

interface IMessage {
  to: string;
  message: unknown;
}

class Resource extends Drash.Http.Resource {
  static paths = ["/"];
  protected messages: any = {};
  public async POST() {
    const packet = this.request.getBodyParam("send_packet");
    if (packet) {
      const socketClient = await connectWebSocket(
        `ws://${socketServer.hostname}:${socketServer.port}`,
      );
      await socketClient.send(JSON.stringify({send_packet:packet}));
      socketClient.close();
    }
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

const socketServer = new Server({ reconnect: false });
socketServer.run({
  hostname: "localhost",
  port: 3000,
});
console.log(
  `socketServer listening: http://${socketServer.hostname}:${socketServer.port}`,
);
console.log(
  "\nIntegration tests: testing different resources can be made and targeted.\n",
);

// Set up the events

socketServer.openChannel("chan1");
socketServer.on(
    "chan1",
    ((packet: any) => {
      storage["chan1"].messages.push(packet.message);
    }),
  );

Deno.test("chan1 should exist", () => {
  assertEquals("chan1", socketServer.getChannel("chan1").name);
});

Deno.test("chan2 should exist again", () => {
  socketServer.openChannel("chan2");
  socketServer.on(
      "chan2",
      ((packet: any) => {
        storage["chan2"].messages.push(packet.message);
      }),
    );
  assertEquals("chan2", socketServer.getChannel("chan2").name);
});

Deno.test("chan1 should have 1 message", async () => {
  await sendMessage("chan1", "This is a chan1 message.");
  assertEquals(
    storage["chan1"].messages,
    [
      "This is a chan1 message.",
    ],
  );
});

Deno.test("chan1 should have 2 messages", async () => {
  await sendMessage("chan1", "This is a chan1 message #2.");
  assertEquals(
    storage["chan1"].messages,
    [
      "This is a chan1 message.",
      "This is a chan1 message #2.",
    ],
  );
});

Deno.test("chan2 should have 1 message", async () => {
  await sendMessage("chan2", "This is a chan2 message.");
  assertEquals(
    storage["chan2"].messages,
    [
      "This is a chan2 message.",
    ],
  );
});

Deno.test("chan2 should be closed", () => {
  socketServer.closeChannel("chan2");
  assertEquals(undefined, socketServer.getChannel("chan2"));
});

Deno.test("chan2 should not receive this message", async () => {
  socketServer.openChannel("chan2");
  await sendMessage("chan2", "Test");
  assertEquals(
    storage["chan2"].messages,
    [
      "This is a chan2 message.",
    ],
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
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      send_packet: {
        to: channel,
        message,
      }
    }),
  });
  await response.text();
}
