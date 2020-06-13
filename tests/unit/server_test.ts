import SocketServer from "../../src/server.ts";
import { assertEquals } from "../../deps.ts";

Deno.test("should connect to 3000 if port is not provided", () => {
  const expect = 1557;
  const server = new SocketServer();
  assertEquals(server.port, expect);
});

Deno.test("should connect to localhost if hostname is not provided", () => {
  const expect = "localhost";
  const server = new SocketServer();
  assertEquals(server.hostname, expect);
});
