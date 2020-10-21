import { Packet, Server } from "../../../mod.ts";
import {deferred, Drash, Rhum} from "../../deps.ts";

////////////////////////////////////////////////////////////////////////////////
// SERVER SETUP ////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

const socketServer = new Server({ reconnect: false });

await socketServer.runTLS({
  hostname: "localhost",
  port: 3001,
  certFile: "./tests/integration/app_3001/server.crt",
  keyFile: "./tests/integration/app_3001/server.key",
});

console.log(
    `socketServer listening: http://${socketServer.hostname}:${socketServer.port}`,
);

const storage: {
  "chan1": {
    messages: unknown[]
  },
  "chan2": {
    messages: unknown[]
  }
} = {
  "chan1": {
    messages: [],
  },
  "chan2": {
    messages: [],
  },
};

socketServer.openChannel("chan1");
socketServer.on("chan1", (packet: Packet) => {
  storage["chan1"].messages.push(packet.message);
});

socketServer.openChannel("chan2");
socketServer.on("chan2", (packet: Packet) => {
  storage["chan2"].messages.push(packet.message);
});

////////////////////////////////////////////////////////////////////////////////
// TESTS ///////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

Rhum.testPlan("app_3001", () => {
  Rhum.testSuite("channel 1", () => {
    Rhum.testCase("chan1 should exist", () => {
      Rhum.asserts.assertEquals(socketServer.getChannel("chan1").name, "chan1");
    });
    Rhum.testCase("chan1 should have a message", async () => {
      const promise = deferred()
      const socketClient = new WebSocket(
          `wss://${socketServer.hostname}:${socketServer.port}`,
      );
      socketClient.onerror = function (e) {
        console.log('error:')
        console.log(e)
      }
      socketClient.onmessage = function (msg) {
        console.log('msg')
      }
      socketClient.onopen = function () {
        console.log('opened')
        console.log('socket client ready state: ' + socketClient.readyState)
        socketClient.send(JSON.stringify({
          data: {
            send_packet: {
              to: "chan1",
              message: "chan message 1-1",
            },
          },
        }));
        socketClient.close()
      }
      socketClient.onclose = function () {
        console.log('closed')
        promise.resolve()
      }
      console.log('before promise')
      await promise
      console.log('after promise')
      console.log(storage)
      Rhum.asserts.assertEquals(
        storage["chan1"].messages,
        ["chan message 1-1"],
      );
    });
    Rhum.testCase("chan2 should have a message", async () => {
      const promise = deferred()
      const socketClient = new WebSocket(
          `wss://${socketServer.hostname}:${socketServer.port}`,
      );
      socketClient.onopen = function () {
        socketClient.send(JSON.stringify({
          data: {
            send_packet: {
              to: "chan2",
              message: "chan message 2-1",
            },
          },
        }));
        socketClient.close()
      }
      socketClient.onclose = function () {
        promise.resolve()
      }
      await promise
      Rhum.asserts.assertEquals(
        storage["chan2"].messages,
        ["chan message 2-1"],
      );
    });
  });
});

Rhum.run();
