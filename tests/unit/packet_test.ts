import { Rhum } from "../deps.ts";
import { Packet, Client } from "../../mod.ts";
import { WebSocket } from "../../deps.ts";

const ClientSocket = () => {
  return {
    send: () => true,
    close: () => true,
  };
};

Rhum.testPlan("unit/packet_test.ts", () => {
  Rhum.testSuite("constructor()", () => {
    Rhum.testCase("Sets the properties", () => {
      const client = new Client(1, ClientSocket() as unknown as WebSocket);
      const packet = new Packet(
        client,
        "The moon",
        "Hello, I am a message",
      );
      Rhum.asserts.assertEquals(packet.from, client);
      Rhum.asserts.assertEquals(packet.message, "Hello, I am a message");
      Rhum.asserts.assertEquals(packet.to, "The moon");
    });
  });
});

Rhum.run();
