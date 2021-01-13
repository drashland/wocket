import { RESERVED_EVENT_NAMES } from "../../../mod.ts";
import { Rhum } from "../../deps.ts";

Rhum.testPlan("unit/reserved_event_names_test.ts", () => {
  Rhum.testSuite("values", () => {
    Rhum.testCase("Should have the correct values", () => {
      Rhum.asserts.assertEquals(RESERVED_EVENT_NAMES, [
        "connect",
        "disconnect",
        "error",
        "listening_to",
        "pong",
        "reconnect",
      ]);
    });
  });
});

Rhum.run();
