import { Server } from "../../mod.ts";
import { deferred } from "../deps.ts";

////////////////////////////////////////////////////////////////////////////////
// TESTS ///////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

Deno.test("HTTPS works", async () => {
  const server = new Server({
    hostname: "localhost",
    port: 3000,
    protocol: "wss",
    certFile: "./tests/integration/server.crt",
    keyFile: "./tests/integration/server.key",
  });
  server.run();
  const client = new WebSocket(
    server.address,
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
