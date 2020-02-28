Deno.env().DRASH_PROCESS = "test";

import { runTests } from "../deps.ts";
export {
  test,
  runTests,
  assertEquals,
  assert,
  assertThrows,
} from "../deps.ts";

// Server
import "./unit/server/event_emitter_test.ts";

// Client
import "./unit/client/client_test.ts";


runTests();
