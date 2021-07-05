import { Rhum } from "../deps.ts";
import { Channel, Client } from "../../mod.ts";
import type { WebSocket } from "../deps.ts";

const wsPlaceholder = 1 as unknown as WebSocket;

Rhum.testPlan("unit/channel_test.ts", () => {
  Rhum.testSuite("constructor()", () => {
    const channel = new Channel("my channel");
    Rhum.testCase("Sets the name property", () => {
      Rhum.asserts.assertEquals(channel.name, "wocket_channel:my channel");
    });
    Rhum.testCase("Contains 0 clients when created", () => {
      Rhum.asserts.assertEquals(channel.clients, new Map());
    });
    Rhum.testCase("Contains 0 callbacks when created", () => {
      Rhum.asserts.assertEquals(channel.callbacks, []);
    });
  });

  Rhum.testSuite("close()", () => {
    Rhum.testCase(
      "Will send a close event to every client connected to the specific channel",
      async () => {
        // Covered in integration tests
      },
    );
  });

  Rhum.testSuite("connectClient()", () => {
    Rhum.testCase("Will set a client against the Channel class", () => {
      const client = new Client(420, wsPlaceholder);
      const channel = new Channel("chat");
      channel.connectClient(client);
      const setClient = channel.clients.get(420);
      Rhum.asserts.assertEquals(!!setClient, true);
    });
  });

  Rhum.testSuite("executeCallbacks()", () => {
    Rhum.testCase(
      "Should call every callback defined in the `callbacks` property of the `Channel` class",
      () => {
        const channel = new Channel("chat");
        let [cbVal1, cbVal2] = [1, 1];
        const callbacks = [
          (_event: CustomEvent) => cbVal1 = 2,
          (_event: CustomEvent) => cbVal2 = 2,
        ];
        channel.callbacks = callbacks;
        channel.executeCallbacks(new CustomEvent("hi :)"));
        Rhum.asserts.assertEquals([cbVal1, cbVal2], [2, 2]);
      },
    );
  });

  Rhum.testSuite("hasClient()", () => {
    Rhum.testCase("Will return true if the channel had that client", () => {
      const client = new Client(420, wsPlaceholder);
      const channel = new Channel("chat");
      channel.clients = new Map();
      channel.clients.set(420, client);
      const result = channel.hasClient(client);
      Rhum.asserts.assertEquals(result, true);
    });
    Rhum.testCase(
      "Will return false of the channel does not have that client",
      () => {
        const client1 = new Client(420, wsPlaceholder);
        const client2 = new Client(420, wsPlaceholder);
        const channel = new Channel("chat");
        channel.clients = new Map();
        channel.clients.set(1, client1);
        const result = channel.hasClient(client2);
        Rhum.asserts.assertEquals(result, false);
      },
    );
  });
});

Rhum.run();
