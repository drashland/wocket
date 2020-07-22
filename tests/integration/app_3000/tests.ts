import { Packet, Server } from "../../../mod.ts";
import { Rhum, Drash, connectWebSocket } from "../../deps.ts";

////////////////////////////////////////////////////////////////////////////////
// SERVER SETUP ////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

class Resource extends Drash.Http.Resource {
  static paths = ["/"];
  protected messages: any = {};
  public async POST() {
    const data = this.request.getBodyParam("data");
    if (data) {
      const socketClient = await connectWebSocket(
        `ws://${socketServer.hostname}:${socketServer.port}`,
      );
      await socketClient.send(JSON.stringify(data));
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

const socketServer = new Server({ reconnect: false });

webServer.run({
  hostname: "localhost",
  port: 3001,
});

console.log(`Web server started on ${webServer.hostname}:${webServer.port}`);

socketServer.run({
  hostname: "localhost",
  port: 3000,
});

console.log(
  `socketServer listening: http://${socketServer.hostname}:${socketServer.port}`,
);

////////////////////////////////////////////////////////////////////////////////
// TESTS ///////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

console.log(
  "\nIntegration tests: testing different channels can be opened and work.\n",
);

let storage: any = {
  "chan1": {
    messages: [],
  },
  "chan2": {
    messages: [],
  },
};

Rhum.testPlan("app_3000", () => {
  socketServer.openChannel("chan1");

  socketServer.on("chan1", (packet: Packet) => {
    storage["chan1"].messages.push(packet.message);
  });

  Rhum.testSuite("channel 1", () => {
    Rhum.testCase("chan1 should exist", () => {
      Rhum.asserts.assertEquals("chan1", socketServer.getChannel("chan1").name);
    });
    Rhum.testCase("chan1 should have a message", async () => {
      await sendMessage(JSON.stringify({
        data: {
          send_packet: {
            to: "chan1",
            message: "chan message 1-1"
          }
        }
      }));
      Rhum.asserts.assertEquals(
        storage["chan1"].messages,
        ["chan message 1-1"],
      );
    });
    Rhum.testCase("chan2 should have a message", async () => {
      socketServer.openChannel("chan2");
      socketServer.on("chan2", () => {
        socketServer.on("chan2", (packet: Packet) => {
          storage["chan2"].messages.push(packet.message);
        });
      });
      await sendMessage(JSON.stringify({
        data: {
          send_packet: {
            to: "chan2",
            message: "chan message 2-1"
          }
        }
      }));
      Rhum.asserts.assertEquals(
        storage["chan2"].messages,
        ["chan message 2-1"],
      );
    });
  });
});

Rhum.run();

Deno.test({
  name: "Stop the server",
  fn() {
    webServer.close();
    socketServer.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

async function sendMessage(message: string) {
  const response = await fetch("http://localhost:3001", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: message,
  });
  await response.text();
}
