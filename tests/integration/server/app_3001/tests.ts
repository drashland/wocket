import { Server } from "../../../mod.ts";
import { deferred, Rhum } from "../../deps.ts";

////////////////////////////////////////////////////////////////////////////////
// TESTS ///////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

Rhum.testPlan("app_3001", () => {
  Rhum.testSuite("Connecting using SSL", () => {
    Rhum.testCase("Should be able to connect", async () => {
      const server = new Server({ reconnect: false });
      await server.runTLS({
        hostname: "localhost",
        port: 3001,
        certFile: "./tests/integration/app_3001/server.crt",
        keyFile: "./tests/integration/app_3001/server.key",
      });
      const client = new WebSocket(
        `wss://${server.hostname}:${server.port}`,
      );
      const promise = deferred();
      client.onopen = function () {
        client.close();
      };
      client.onerror = function (err) {
        console.error(err);
        throw new Error("Fix meeeee, i dont work :(");
      };
      client.onclose = function () {
        promise.resolve();
      };
      await promise;
      await server.close();
    });
  });
});

Rhum.run();
