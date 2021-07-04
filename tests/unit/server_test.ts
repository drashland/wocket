import { Server } from "../../mod.ts";
import { Rhum } from "../deps.ts";
import { serve } from "../../deps.ts"

Rhum.testPlan("unit/server_test.ts", () => {
  Rhum.testSuite("constructor()", () => {
    Rhum.testCase("should connect to 3000 if port is not provided", () => {
      const expect = 1557;
      const server = new Server();
      Rhum.asserts.assertEquals(server.port, expect);
    });
    Rhum.testCase(
      "should connect to localhost if hostname is not provided",
      () => {
        const expect = "0.0.0.0";
        const server = new Server();
        Rhum.asserts.assertEquals(server.hostname, expect);
      },
    );
  });
  Rhum.testSuite("close()", () => {
    Rhum.testCase("Should close the deno server", async () => {
      const server = new Server()
      server.deno_server = serve({ port: 8000 })
      server.close()
      // If server is closed, this for loop should be skipped. If server was not closed, this loop will be executed and will hang indefinitely
      for await (const _req of server.deno_server) {}
    })
    Rhum.testCase("Should not error if server is not set or not defined", () => {
      const server = new Server()
      server.close()
    })
    Rhum.testCase("Should not error if server is already closed", () => {
      const server = new Server()
      server.deno_server = serve({ port: 8000 })
      server.close()
      server.close()
    })
  })

  Rhum.testSuite("closeChannel()", () => {
    Rhum.testCase("Should close and delete a channel by name", async () => {
      const server = new Server()
      server.channels.set("my channel", "ooo")
      server.closeChannel("my channel")
      const channel = server.channels.get("my channel")
      Rhum.asserts.assertEquals(channel, null)
    })
  })
});

Rhum.run();
