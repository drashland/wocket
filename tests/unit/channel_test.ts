import { Rhum } from "../deps.ts";
import { Channel } from "../../mod.ts";

Rhum.testPlan("unit/channel_test.ts", () => {
  Rhum.testSuite("constructor()", () => {
    const channel = new Channel("my channel");
    Rhum.testCase("Sets the name", () => {
      Rhum.asserts.assertEquals(channel.name, "wocket_channel:my channel");
    });
    Rhum.testCase("Contains 0 clients when created", () => {
      Rhum.asserts.assertEquals(channel.clients, new Map());
    });
    Rhum.testCase("Contains 0 callbacks when created", () => {
      Rhum.asserts.assertEquals(channel.callbacks, []);
    });
  });
});

Rhum.run();
