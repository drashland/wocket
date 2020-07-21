import { RESERVED_EVENT_NAMES } from "../../src/reserved_event_names.ts";
import { Rhum } from "../deps.ts";

Rhum.testPlan("unit/reserved_event_names_test.ts", () => {
   Rhum.testSuite("values", () => {
     Rhum.testPlan("Should have the correct values", () => {
       Rhum.asserts.assertEquals(RESERVED_EVENT_NAMES, [
         "connection",
         "disconnect",
         "error",
         "listening_to",
         "pong",
         "reconnect",
       ])
     })
   })
});

Rhum.run()