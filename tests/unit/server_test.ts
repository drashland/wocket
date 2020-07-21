import { Server } from "../../src/server.ts";
import { assertEquals, Rhum } from "../deps.ts";

Rhum.testPlan("unit/server_test.ts", () => {
  Rhum.testSuite("constructor()", () => {
    Rhum.testCase("should connect to 3000 if port is not provided", () => {
      const expect = 1557;
      const server = new Server();
      assertEquals(server.port, expect);
    });
    Rhum.testCase("should connect to localhost if hostname is not provided", () => {
      const expect = "localhost";
      const server = new Server();
      assertEquals(server.hostname, expect);
    });
  })
})

Rhum.run()
