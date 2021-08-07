import { Rhum } from "../deps.ts";
import { Channel } from "../../mod.ts";

Rhum.testPlan("unit/channel_test.ts", () => {
  Rhum.testSuite("constructor()", () => {
    Rhum.testCase("Sets the name and creates empty listeners", () => {
      const channel = new Channel("my channel");
      Rhum.asserts.assertEquals(channel.name, "my channel");
      Rhum.asserts.assertEquals(channel.listeners, new Map());
      Rhum.asserts.assertEquals(channel.callbacks, []);
    });
  });
});

Rhum.run();
