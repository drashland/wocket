import { Packet, Server } from "../../../mod.ts";
import { deferred, Rhum } from "../../deps.ts";
import {
  closeClients,
  connectToChannels,
  waitForClientToOpen,
  waitForMsg,
} from "../../test_helpers.ts";

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
  const WSServer = new Server();

  await WSServer.runWs({
    hostname: opts.hostname || "127.0.0.1",
    port: opts.port || 3000,
  });

  return WSServer;
}

async function waitForMessage(
  client: WebSocket,
): Promise<Record<string, unknown>> {
  // deno-lint-ignore no-explicit-any
  const p = deferred<any>();
  client.onmessage = (event) => {
    const data = JSON.parse(event.data);
    p.resolve(data.message);
  };
  const result = await p;
  return result;
}

// deno-lint-ignore no-explicit-any
function sendMsg(client: WebSocket, channel: string, message: any) {
  client.send(JSON.stringify({
    send_packet: {
      to: channel,
      message: message,
    },
  }));
}

async function sendMsgAndGetRes(
  client: WebSocket,
  // deno-lint-ignore no-explicit-any
  message: any,
  channel: string,
) {
  sendMsg(client, channel, message);
  return await waitForMessage(client);
}

async function closeClient(client: WebSocket) {
  const p = deferred();
  client.onclose = () => {
    p.resolve();
  };
  client.close();
  await p;
}

async function createClient(channelsToConnectTo: string[]) {
  // connect
  const client = new WebSocket("ws://127.0.0.1:3000");
  const p1 = deferred();
  client.onopen = () => p1.resolve();
  await p1;
  // connect to channels
  client.send(JSON.stringify({
    connect_to: channelsToConnectTo,
  }));
  const p2 = deferred();
  const expectedConnEvents = channelsToConnectTo.length;
  let connEvents = 0;
  client.onmessage = () => {
    connEvents++;
    if (connEvents === expectedConnEvents) {
      p2.resolve();
    }
  };
  await p2;
  return client;
}

////////////////////////////////////////////////////////////////////////////////
// TESTS ///////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

console.log(
  "\nIntegration tests: testing different channels can be opened and work.\n",
);

Rhum.testPlan("app_3000", () => {
  Rhum.testSuite("server", () => {
    Rhum.testCase(
      "Should be able to suse generics when using `on()`",
      async () => {
        const server = await createWebSocketServer();
        server.on<{ username: string }>("chan1", (data: Packet) => {
          const { username } = data.message;
          const _username = username; // so lint thinks we use it
        });
        await server.close();
      },
    );
    Rhum.testCase("should allow clients to connect", async () => {
      const server = await createWebSocketServer();
      server.on("chan1", (_data: Packet) => {
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
      client.onmessage = function (message) {
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
        client.onmessage = function (message) {
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
        server.on("emit to specific client", (packet: Packet) => {
          const idToSendTo = Number(packet.message);
          server.to(
            "emit to specific client",
            `Hello from ${packet.from.id}`,
            idToSendTo,
          );
        });
        server.on("get-id", (packet: Packet) => {
          server.to("get-id", { id: packet.from.id }, Number(packet.from.id));
        });
        const clientOne = await createClient([
          "emit to specific client",
          "get-id",
        ]);
        const clientTwo = await createClient([
          "emit to specific client",
          "get-id",
        ]);
        const clientThree = await createClient([
          "emit to specific client",
          "get-id",
        ]);
        // Get connected messages out of the way
        const client1Id = (await sendMsgAndGetRes(clientOne, {}, "get-id")).id;
        const client2Id = (await sendMsgAndGetRes(clientTwo, {}, "get-id")).id;
        const client3Id =
          (await sendMsgAndGetRes(clientThree, {}, "get-id")).id;
        // Send a message to client 3 and expect only client 3 gets it and not client 1 or 2
        sendMsg(clientOne, "emit to specific client", client2Id);
        const client2Response = await waitForMessage(clientTwo);
        sendMsg(clientTwo, "emit to specific client", client3Id);
        const client3Response = await waitForMessage(clientThree);
        sendMsg(clientThree, "emit to specific client", client1Id);
        const client1Response = await waitForMessage(clientOne);
        await closeClient(clientOne);
        await closeClient(clientTwo);
        await closeClient(clientThree);
        await server.close();
        Rhum.asserts.assertEquals(client1Response, "Hello from " + client3Id);
        Rhum.asserts.assertEquals(client2Response, "Hello from " + client1Id);
        Rhum.asserts.assertEquals(client3Response, "Hello from " + client2Id);
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
            message.data.includes(" is not connected to chan1"),
            true,
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
        client.onmessage = function (message) {
          messageCount++;
          if (messageCount === 1) {
            Rhum.asserts.assertEquals(
              message.data,
              'Channel "chan2" does not exist.',
            );
          } else {
            Rhum.asserts.assertEquals(
              message.data.includes(" is not connected to chan2"),
              true,
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
      client.onmessage = function (message) {
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
    Rhum.testCase(
      "close() will send a close message to clients for that specific channel",
      async () => {
        const server = new Server();
        server.on("chat", () => {});
        server.on("not-chat", () => {});
        await server.runWs({ port: 1445 });
        const url = "ws://localhost:1445";
        const client1 = new WebSocket(url);
        const client2 = new WebSocket(url);
        const client3 = new WebSocket(url);
        await waitForClientToOpen(client2);
        await waitForClientToOpen(client1);
        await waitForClientToOpen(client3);
        const channels = ["chat"];
        await connectToChannels(client1, channels);
        await connectToChannels(client2, channels);
        await connectToChannels(client3, ["not-chat"]);
        const Channels = server.channels;
        const chatChannel = Channels.get("chat");
        await chatChannel!.close();
        const client1Message = await waitForMsg(client1);
        const client2Message = await waitForMsg(client2);
        // TODO(any): How do we assert that client3 didnt receive a msg? because they arent connected to chat channel, they shouldnt get one
        await closeClients(client1, client2, client3);
        await server.close();
        Rhum.asserts.assertEquals(client1Message, "chat closed");
        Rhum.asserts.assertEquals(client2Message, "chat closed");
      },
    );
  });
  Rhum.testSuite("Reserved Event Names", () => {
    Rhum.testCase("connect", async () => {
      const server = await createWebSocketServer();
      let connections = 0;
      server.on("connect", (_data: Packet) => {
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
      server.on("disconnect", (_data: Packet) => {
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
