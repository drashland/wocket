import SocketServer from "../../../src/server/server.ts";
import { assertEquals } from "../../test.ts";

SocketServer.prototype.connect = (): Promise<void> => { return Promise.resolve(); };

Deno.test("should connect to 3000 if port is not provided", () => {
  const expect = "3000";
  const server = new SocketServer();
  const serverConfigs = server.getConfig();
  assertEquals(serverConfigs.port, expect);
});

Deno.test("should connect to provided port", () => {
  const expect = "3333";
  const server = new SocketServer({ port: "3333" });
  const serverConfigs = server.getConfig();
  assertEquals(serverConfigs.port, expect);
});

Deno.test("should connect to 127.0.0.1 if address is not provided", () => {
  const expect = "127.0.0.1";
  const server = new SocketServer({ port: 3333 });
  const serverConfigs = server.getConfig();
  assertEquals(serverConfigs.address, expect);
});

Deno.test("should connect to provided address", () => {
  const expect = "1.1.1.1";
  const server = new SocketServer({ address: "1.1.1.1" });
  const serverConfigs = server.getConfig();
  assertEquals(serverConfigs.address, expect);
});

Deno.test("should connect to provided address and port", () => {
  const expect = { address: "1.1.1.1", port: "1111" };
  const server = new SocketServer({
    address: "1.1.1.1",
    port: "1111",
  });
  const serverConfigs = server.getConfig();
  assertEquals(serverConfigs, expect);
});
