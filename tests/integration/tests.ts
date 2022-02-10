import { Server } from "../../mod.ts";
import { assertEquals, deferred } from "../deps.ts";
import { WebSocketClient } from "../../src/websocket_client.ts";

Deno.test("Full fledged end to end test", async () => {
  const server = new Server({
    hostname: "localhost",
    port: 1447,
    protocol: "ws",
  });

  server.run();

  const p = deferred();

  const connectCalled: number[] = [];

  // Example using the connect handler
  server.on("connect", (e) => {
    const { id } = e.detail;
    connectCalled.push(id);
  });

  let disconnectCalled = null;

  // Example using the disconnect handler
  server.on("disconnect", (
    e,
  ) => {
    const { id, code, reason } = e.detail;
    disconnectCalled = {
      id,
      code,
      reason,
    };
  });

  let channelCalled = null;

  // Example using generics + custom channel handler and getting the data from the event
  type UserMessage = {
    username: string;
    sender: number;
    id: number; // client socket id
  };
  server.on<UserMessage>("channel", (event) => {
    const { username, sender, id } = event.detail.packet;
    channelCalled = {
      username,
      sender,
      id,
    };

    // Example sending to all clients, specifying which channel it is for
    server.to("chat-message", {
      message: "yep, the server got your msg :)",
    });

    // example sending to a specific client
    server.to("chat-message", {
      message: "this message is only for you *wink wink*",
    }, 0);

    // example sending to all OTHER clients TODO :: broadcast?
    server.broadcast("chat-message", {
      message: "You got this message but client with id of " + id +
        " shouldnt have",
    }, 0);
  });

  const client1ReceivedMessages: string[] = [];
  const client2ReceivedMessages: string[] = [];

  const client = new WebSocketClient("ws://localhost:1447");
  const p1 = deferred();
  client.onopen = () => p1.resolve();
  await p1;
  const client2 = new WebSocketClient(server.address);
  const pTwo = deferred();
  client2.onopen = () => pTwo.resolve();
  await pTwo;
  client.on<{ message: string }>("chat-message", (packet) => {
    const { message } = packet;
    client1ReceivedMessages.push(message);
  });
  client2.on<{ message: string }>("chat-message", (packet) => {
    const { message } = packet;
    client2ReceivedMessages.push(message);
    if (client2ReceivedMessages.length === 2) {
      p.resolve();
    }
  });
  client.to("channel", {
    username: "darth vader",
    sender: 69,
  });

  await p;
  const p2 = deferred();
  const p3 = deferred();
  client.onclose = () => p2.resolve();
  client2.onclose = () => p3.resolve();
  client.close();
  client2.close();
  await p2;
  await p3;
  await server.close();
  assertEquals(connectCalled, [0, 1]);
  assertEquals(disconnectCalled, {
    code: 1005,
    id: 1,
    reason: "",
  });
  assertEquals(channelCalled, {
    username: "darth vader",
    sender: 69,
    id: 0,
  });
  assertEquals(client1ReceivedMessages, [
    "yep, the server got your msg :)",
    "this message is only for you *wink wink*",
  ]);
  assertEquals(client2ReceivedMessages, [
    "yep, the server got your msg :)",
    "You got this message but client with id of 0 shouldnt have",
  ]);
});
