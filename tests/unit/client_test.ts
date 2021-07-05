import { Rhum, TestHelpers, WebSocket } from "../deps.ts";
import { Channel, Client } from "../../mod.ts";

Rhum.testPlan("unit/client_test.ts", () => {
  Rhum.testSuite("constructor()", () => {
    const client = new Client(
      1,
      TestHelpers.fakeClientSocket() as unknown as WebSocket,
    );
    Rhum.testCase("Sets the id property", () => {
      Rhum.asserts.assertEquals(client.id, 1);
    });
    Rhum.testCase("Sets the socket property", () => {
      Rhum.asserts.assertEquals(client.socket.send("test"), true);
      Rhum.asserts.assertEquals(client.socket.close(1337), true);
    });
    Rhum.testCase("Contains 0 channels when created", () => {
      Rhum.asserts.assertEquals(client.channels.size, 0);
    });
  });

  Rhum.testSuite("connectToChannel()", () => {
    Rhum.testCase("adds the channel to the client's channels property", () => {
      const client = new Client(
        1,
        TestHelpers.fakeClientSocket() as unknown as WebSocket,
      );
      const channel1 = new Channel("test_channel_1");
      client.connectToChannel(channel1);

      // Assert that the channel was added
      Rhum.asserts.assertEquals(client.channels.size, 1);
      Rhum.asserts.assertEquals(client.channels.get(channel1.name), channel1);

      // Assert that the channel can send events to the client
      channel1.connectClient(client);
      const result = channel1.clients.get(1)!
        .handlePacket(channel1, { from_channel: "test_channel_1" });
      Rhum.asserts.assertEquals(result, {
        from_channel: "test_channel_1",
        sender: "wocket_channel:test_channel_1",
      });
    });
  });

  Rhum.testSuite("disconnectFromAllChannels()", () => {
    Rhum.testCase("disconnects client from all channels", () => {
      const client = new Client(
        1,
        TestHelpers.fakeClientSocket() as unknown as WebSocket,
      );

      // Connect the client to the following channels
      const channel1 = new Channel("test_channel_1");
      channel1.connectClient(client);
      const channel2 = new Channel("test_channel_2");
      channel2.connectClient(client);
      client.connectToChannel(channel1);
      client.connectToChannel(channel2);

      // Assert that the client is now connected to the two channels
      Rhum.asserts.assertEquals(client.channels.size, 2);
      Rhum.asserts.assertEquals(channel1.clients.get(1), client);
      Rhum.asserts.assertEquals(channel2.clients.get(1), client);

      // Assert that the client has been disconnected from all channels
      client.disconnectFromAllChannels();
      Rhum.asserts.assertEquals(client.channels.size, 0);
      Rhum.asserts.assertEquals(channel1.clients.get(1), undefined);
      Rhum.asserts.assertEquals(channel2.clients.get(1), undefined);
    });
  });
});

Rhum.run();
