import { Rhum } from "../deps.ts";
import { Channel } from "../../src/channel.ts";

Rhum.testPlan("unit/channel_test.ts", () => {
  Rhum.testSuite("constructor()", () => {
    Rhum.testCase("Sets the name and creates empty listeners", () => {
      const channel = new Channel("my channel");
      Rhum.asserts.assertEquals(channel.name, "my channel");
      Rhum.asserts.assertEquals(channel.listeners, {});
      Rhum.asserts.assertEquals(channel.callbacks, []);
    });
  });
});

Rhum.run();
