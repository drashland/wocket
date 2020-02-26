import SocketClient from "../../../src/client/client.ts";
import { test, assertEquals, assert } from "../../test.ts";

test("should connect to 3000 if port is not provided", () => {
  const expect = 3000;
  const client = new SocketClient();
  const clientOptions = client.getOptions();
  assertEquals(clientOptions.port, expect);
});

test("should connect to provided port", () => {
  const expect = 3333;
  const client = new SocketClient({ port: 3333 });
  const clientOptions = client.getOptions();
  assertEquals(clientOptions.port, expect);
});

test("should connect to 127.0.0.1 if address is not provided", () => {
  const expect = "127.0.0.1";
  const client = new SocketClient({ port: 3333 });
  const clientOptions = client.getOptions();
  assertEquals(clientOptions.address, expect);
});

test("should connect to provided address", () => {
  const expect = "1.1.1.1";
  const client = new SocketClient({ address: "1.1.1.1", port: 3333 });
  const clientOptions = client.getOptions();
  assertEquals(clientOptions.address, expect);
});

test("should connect to provided address and port", () => {
  const expect = { address:"1.1.1.1", port: 1111 };
  const client = new SocketClient({
    address:"1.1.1.1",
    port: 1111,
  });
  const clientOptions = client.getOptions();
  assertEquals(clientOptions, expect);
});
