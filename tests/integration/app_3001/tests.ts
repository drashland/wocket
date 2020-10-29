import { Server } from "../../../mod.ts";
import { deferred, Rhum } from "../../deps.ts";

////////////////////////////////////////////////////////////////////////////////
// TESTS ///////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

Rhum.testPlan("app_3001", () => {
  Rhum.testSuite("Connecting using SSL", () => {
    Rhum.testCase("Should be able to connect", async () => {
      const socketServer = new Server({ reconnect: false });
      await socketServer.runTLS({
        hostname: "localhost",
        port: 3001,
        certFile: "./tests/integration/app_3001/server.crt",
        keyFile: "./tests/integration/app_3001/server.key",
      });
      const socketClient = new WebSocket(
        `wss://${socketServer.hostname}:${socketServer.port}`,
      );
      const promise = deferred();
      socketClient.onopen = function () {
        socketClient.close();
      };
      socketClient.onclose = function () {
        promise.resolve();
      };
      await promise;
      socketServer.close();
    });
  });
});

Rhum.run();
