import { Packet, Server } from "../../../mod.ts";
import { deferred, Rhum, WebSocket } from "../../deps.ts";

////////////////////////////////////////////////////////////////////////////////
// WEB SOCKET SERVER SETUP /////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

async function createWebSocketServer(
  opts: { hostname: string; port: number; reconnect: boolean } = {
    hostname: "127.0.0.1",
    port: 3000,
    reconnect: false,
  },
): Promise<Server> {
  const WSServer = new Server({ reconnect: opts.reconnect || false });

  await WSServer.run({
    hostname: opts.hostname || "127.0.0.1",
    port: opts.port || 3000,
  });

  return WSServer;
}

////////////////////////////////////////////////////////////////////////////////
// TESTS ///////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

console.log(
  "\nIntegration tests: testing different channels can be opened and work.\n",
);

Rhum.testPlan("app_3000", () => {
  Rhum.testSuite("server", () => {
    Rhum.testCase("should allow clients to connect", async () => {
      const server = await createWebSocketServer();
      server.on("chan1", (data: Packet) => {
      });
      const promise = deferred();
      const client = new WebSocket(
        `ws://${server.hostname}:${server.port}`,
      );
      client.onopen = function () {
        client.send(JSON.stringify({
          connect_to: ["chan1"],
        }));
      };
      client.onmessage = function (message: any) {
        Rhum.asserts.assertEquals(message.data, "Connected to chan1.");
        client.close();
      };
      client.onclose = function () {
        promise.resolve();
      };
      await promise;
      await server.close();
    });

    Rhum.testCase(
      "should allow messages to be sent back and forth, after connecting to a channel",
      async () => {
        const server = await createWebSocketServer();
        server.on("chan1", (packet: Packet) => {
          server.to("chan1", packet.message);
        });
        const client = new WebSocket(
          `ws://${server.hostname}:${server.port}`,
        );
        const promise = deferred();
        client.onopen = function () {
          client.send(JSON.stringify({
            connect_to: ["chan1"],
          }));
          client.send(JSON.stringify({
            send_packet: {
              to: "chan1",
              message: "Hi server :)",
            },
          }));
        };
        let messageCount = 0;
        client.onmessage = function (message: any) {
          messageCount++;
          if (messageCount === 2) {
            Rhum.asserts.assertEquals(JSON.parse(message.data), {
              from: "Server",
              to: "chan1",
              message: "Hi server :)",
            });
            client.close();
          }
        };
        client.onclose = function () {
          promise.resolve();
        };
        await promise;
        await server.close();
      },
    );
    Rhum.testCase(
      "Should be able to emit events to a specific client",
      async () => {
        const untilClientOneIsReady = deferred();
        const untilClientTwoIsReady = deferred();
        const untilClientThreeIsReady = deferred();
        const server = await createWebSocketServer();
        server.on("emit to specific client", (packet: Packet) => {
          const idToSendTo = Number(packet.message);
          server.to(
            "emit to specific client",
            `Hello from ${packet.from.id}`,
            idToSendTo,
          );
        });
        const clientOne = new WebSocket(
          `ws://${server.hostname}:${server.port}`,
        );
        const clientTwo = new WebSocket(
          `ws://${server.hostname}:${server.port}`,
        );
        const clientThree = new WebSocket(
          `ws://${server.hostname}:${server.port}`,
        );
        // Wait until everyone is connected
        clientOne.onopen = function () {
          clientOne.send(JSON.stringify({
            connect_to: ["emit to specific client"],
          }));
          untilClientOneIsReady.resolve();
        };
        clientTwo.onopen = function () {
          clientTwo.send(JSON.stringify({
            connect_to: ["emit to specific client"],
          }));
          untilClientTwoIsReady.resolve();
        };
        clientThree.onopen = function () {
          clientThree.send(JSON.stringify({
            connect_to: ["emit to specific client"],
          }));
          untilClientThreeIsReady.resolve();
        };
        await untilClientOneIsReady;
        await untilClientTwoIsReady;
        await untilClientThreeIsReady;
        // Create message handlers
        const clientOneMessages: any[] = [];
        const clientTwoMessages: any[] = [];
        const clientThreeMessages: any[] = [];
        clientOne.onmessage = function (message: any) {
          clientOneMessages.push(message);
          if (clientOneMessages.length === 2) {
            clientOne.close();
          }
        };
        clientTwo.onmessage = function (message: any) {
          clientTwoMessages.push(message);
          if (clientTwoMessages.length === 2) {
            clientTwo.close();
          }
        };
        clientThree.onmessage = function (message: any) {
          clientThreeMessages.push(message);
          if (clientThreeMessages.length === 2) {
            clientThree.close();
          }
        };
        // Send a message to client 3 and expect only client 3 gets it and not client 1 or 2
        clientThree.send(JSON.stringify({
          send_packet: {
            to: "emit to specific client",
            message: "10", // id of client 1
          },
        }));
        clientOne.send(JSON.stringify({
          send_packet: {
            to: "emit to specific client",
            message: "11", // id of client 2
          },
        }));
        clientTwo.send(JSON.stringify({
          send_packet: {
            to: "emit to specific client",
            message: "12", // id of client 3
          },
        }));
        // Now close the connections
        const untilClientOneIsClosed = deferred();
        const untilClientTwoIsClosed = deferred();
        const untilClientThreeIsClosed = deferred();
        clientOne.onclose = function () {
          untilClientOneIsClosed.resolve();
        };
        clientTwo.onclose = function () {
          untilClientTwoIsClosed.resolve();
        };
        clientThree.onclose = function () {
          untilClientThreeIsClosed.resolve();
        };
        await untilClientOneIsClosed;
        await untilClientTwoIsClosed;
        await untilClientThreeIsClosed;
        //console.log([clientOneMessages, clientTwoMessages])
        Rhum.asserts.assertEquals(clientOneMessages.length, 2);
        Rhum.asserts.assertEquals(
          clientOneMessages[0].data,
          "Connected to emit to specific client.",
        );
        Rhum.asserts.assertEquals(
          clientOneMessages[1].data,
          '{"from":"Server","to":"emit to specific client","message":"Hello from 12"}',
        );
        Rhum.asserts.assertEquals(clientTwoMessages.length, 2);
        Rhum.asserts.assertEquals(
          clientTwoMessages[0].data,
          "Connected to emit to specific client.",
        );
        Rhum.asserts.assertEquals(
          clientTwoMessages[1].data,
          '{"from":"Server","to":"emit to specific client","message":"Hello from 10"}',
        );
        Rhum.asserts.assertEquals(clientThreeMessages.length, 2);
        Rhum.asserts.assertEquals(
          clientThreeMessages[0].data,
          "Connected to emit to specific client.",
        );
        Rhum.asserts.assertEquals(
          clientThreeMessages[1].data,
          '{"from":"Server","to":"emit to specific client","message":"Hello from 11"}',
        );
        await server.close();
      },
    );

    Rhum.testCase(
      "Cannot send messages to channels a user hasn't connected to",
      async () => {
        const promise = deferred();
        const server = await createWebSocketServer();
        const client = new WebSocket(
          `ws://${server.hostname}:${server.port}`,
        );
        client.onopen = function () {
          client.send(JSON.stringify({
            send_packet: {
              to: "chan1",
              message:
                "This message was sent from the client, but the client shouldn't be allowed to do this",
            },
          }));
        };
        client.onmessage = function (message) {
          Rhum.asserts.assertEquals(
            message.data,
            "Client 17 is not connected to chan1",
          );
          client.close();
        };
        client.onclose = function () {
          promise.resolve();
        };
        await promise;
        await server.close();
      },
    );

    Rhum.testCase(
      "Does not allow connecting and sending a message to a channel that isn't opened",
      async () => {
        const promise = deferred();
        const server = await createWebSocketServer();
        const client = new WebSocket(
          `ws://${server.hostname}:${server.port}`,
        );
        client.onopen = function () {
          client.send(JSON.stringify({
            connect_to: ["chan2"],
          }));
          client.send(JSON.stringify({
            send_packet: {
              to: "chan2",
              message: "Message to chan2 from client",
            },
          }));
        };
        let messageCount = 0;
        client.onmessage = function (message: any) {
          messageCount++;
          if (messageCount === 1) {
            Rhum.asserts.assertEquals(
              message.data,
              'Channel \"chan2\" does not exist.',
            );
          } else {
            Rhum.asserts.assertEquals(
              message.data,
              "Client 20 is not connected to chan2",
            );
            client.close();
          }
        };
        client.onclose = function () {
          promise.resolve();
        };
        await promise;
        await server.close();
      },
    );

    Rhum.testCase("Must send message before closing channel", async () => {
      const promise = deferred();
      const server = await createWebSocketServer();
      server.on("chan1", (packet: Packet) => {
        if (packet.message === "close") {
          server.closeChannel("chan1");
        }
      });
      const client = new WebSocket(
        `ws://${server.hostname}:${server.port}`,
      );
      client.onopen = function () {
        client.send(JSON.stringify({
          connect_to: ["chan1"],
        }));
      };
      client.onmessage = function (message: any) {
        if (message.data == "Connected to chan1.") {
          client.send(
            JSON.stringify({ send_packet: { to: "chan1", message: "close" } }),
          );
        } else {
          Rhum.asserts.assertEquals(message.data, "chan1 closed.");
          client.close();
        }
      };
      client.onclose = function () {
        promise.resolve();
      };
      await promise;
      await server.close();
    });
  });
  Rhum.testSuite("Reserved Event Names", () => {
    Rhum.testCase("connect", async () => {
      const server = await createWebSocketServer();
      let connections = 0;
      server.on("connect", (data: Packet) => {
        connections++;
      });
      const client = new WebSocket(`ws://${server.hostname}:${server.port}`);
      const promise = deferred();
      client.onopen = function () {
        client.close();
      };
      client.onclose = function () {
        promise.resolve();
      };
      await promise;
      await server.close();
      Rhum.asserts.assertEquals(connections, 1);
    });
    Rhum.testCase("disconnect", async () => {
      const server = await createWebSocketServer();
      let disconnections = 0;
      const untilDisconnectEvent = deferred();
      server.on("disconnect", (data: Packet) => {
        disconnections++;
        untilDisconnectEvent.resolve();
      });
      const client = new WebSocket(`ws://${server.hostname}:${server.port}`);
      const untilClientIsClosed = deferred();
      client.onopen = function () {
        client.close();
      };
      client.onclose = function () {
        untilClientIsClosed.resolve();
      };
      await untilClientIsClosed;
      await untilDisconnectEvent;
      await server.close();
      Rhum.asserts.assertEquals(disconnections, 1);
    });
  });
});

Rhum.run();
