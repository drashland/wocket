import { Rhum } from "../deps.ts";
import { Client } from "../../src/client.ts";
import { WebSocket } from "../../deps.ts";

const ClientSocket = () => {
  return {
    send: () => true,
    close: () => true,
  };
};

Rhum.testPlan("unit/client_test.ts", () => {
  Rhum.testSuite("constructor()", () => {
    Rhum.testCase("Sets the properties", () => {
      const client = new Client(1, ClientSocket() as unknown as WebSocket);
      Rhum.asserts.assertEquals(client.heartbeat_id, null);
      Rhum.asserts.assertEquals(client.id, 1);
      Rhum.asserts.assertEquals(client.listening_to, []);
      Rhum.asserts.assertEquals(client.pong_received, false);
      Rhum.asserts.assertEquals(typeof client.socket.send, "function");
      Rhum.asserts.assertEquals(typeof client.socket.close, "function");
    });
  });
});

Rhum.run();
