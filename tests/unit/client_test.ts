import { Rhum } from "../deps.ts";
import { Client, Channel } from "../../mod.ts";
import { WebSocket } from "../../deps.ts";

const ClientSocket = () => {
  return {
    send: () => true,
    close: () => true,
  };
};

Rhum.testPlan("unit/client_test.ts", () => {
  Rhum.testSuite("constructor()", () => {
    const client = new Client(1, ClientSocket() as unknown as WebSocket);
    Rhum.testCase("Sets the id", () => {
      Rhum.asserts.assertEquals(client.id, 1);
    });
    Rhum.testCase("Sets the socket", () => {
      Rhum.asserts.assertEquals(client.socket.send("test"), true)
      Rhum.asserts.assertEquals(client.socket.close(1337), true)
    });
  });

  Rhum.testSuite("connectToChannel()", () => {
    Rhum.testCase("adds the channel to the client's channels property", () => {
      const client = new Client(1, ClientSocket() as unknown as WebSocket);
      const channel1 = new Channel("test_channel_1");
      client.connectToChannel(channel1);

      Rhum.asserts.assertEquals(client.channels.size, 1);
    });
  });

  Rhum.testSuite("disconnectFromAllChannels()", () => {
    Rhum.testCase("disconnects client from all channels", () => {
      const client = new Client(1, ClientSocket() as unknown as WebSocket);
      const channel1 = new Channel("test_channel_1");
      const channel2 = new Channel("test_channel_2");
      client.connectToChannel(channel1);
      client.connectToChannel(channel2);

      Rhum.asserts.assertEquals(client.channels.size, 2);

      client.disconnectFromAllChannels();
      Rhum.asserts.assertEquals(client.channels.size, 0);
    });
  });

  Rhum.testSuite("handlePacket()", () => {
    Rhum.testCase("dispatches the packet in an event", () => {
      const receiver = new Client(1, ClientSocket() as unknown as WebSocket);
      const sender = new Client(2, ClientSocket() as unknown as WebSocket);
      const result = receiver.handlePacket(sender, {
        message: "hella"
      });

      Rhum.asserts.assertEquals(result, { message: "hella", sender: 2 });
    });
  });
});

Rhum.run();
