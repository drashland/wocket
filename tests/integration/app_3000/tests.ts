import { Packet, Server } from "../../../mod.ts";
import { Rhum, WebSocket, serve } from "../../deps.ts";
const decoder = new TextDecoder();

interface ResolvableMethods<T> {
  resolve: (value?: T | PromiseLike<T>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reject: (reason?: any) => void;
}

type Resolvable<T> = Promise<T> & ResolvableMethods<T>;

function createResolvable<T>(): Resolvable<T> {
  let methods: ResolvableMethods<T>;
  const promise = new Promise<T>((resolve, reject): void => {
    methods = { resolve, reject };
  });
  // TypeScript doesn't know that the Promise callback occurs synchronously
  // therefore use of not null assertion (`!`)
  return Object.assign(promise, methods!) as Resolvable<T>;
}

////////////////////////////////////////////////////////////////////////////////
// WEB SOCKET SERVER SETUP /////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

const WSServer = new Server({ reconnect: false });

await WSServer.run({
  hostname: "127.0.0.1",
  port: 3000,
});

// Set up connect channel
WSServer.on("connect", (packet: Packet) => {
  WSServer.to("chan1", packet.message)
});

// Set up the chan1 channel
WSServer.openChannel("chan1");
WSServer.on("chan1", (packet: Packet) => {
  WSServer.to("chan1", packet.message)
});

////////////////////////////////////////////////////////////////////////////////
// TESTS ///////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

console.log(
  "\nIntegration tests: testing different channels can be opened and work.\n",
);

Rhum.testPlan("app_3000", () => {

  Rhum.testSuite("server", () => {

    Rhum.testCase("should allow clients to connect", async () => {

      const promise = createResolvable();

      const WSClient = new WebSocket(`ws://${WSServer.hostname}:${WSServer.port}`);

      WSClient.onopen = function () {
        WSClient.send(JSON.stringify({
            connect_to: ["chan1"]
        }))
      }

      WSClient.onmessage = function (message: any) {
          Rhum.asserts.assertEquals(message.data, "Connected to chan1.")
          WSClient.close()
      }

      WSClient.onclose = function () {
        promise.resolve()
      }

      await promise;
    });
    Rhum.testCase("should allow messages to be sent back and forth", async () => {
      const promise = createResolvable();

      const WSClient = new WebSocket(`ws://${WSServer.hostname}:${WSServer.port}`);

      WSClient.onopen = function () {
        WSClient.send(JSON.stringify({
            connect_to: ["chan1"]
        }))
        WSClient.send(JSON.stringify({
          send_packet: {
            to: "chan1",
            message: "Hi server :)"
          }
        }))
      }

      let messageCount = 0
      WSClient.onmessage = function (message: any) {
        messageCount++
        if (messageCount === 2) {
          Rhum.asserts.assertEquals(JSON.parse(message.data), {
            from: "Server",
            to: "chan1",
            message: "Hi server :)"
          })
          WSClient.close()
        }
      }

      WSClient.onclose = function () {
        promise.resolve()
      }

      await promise;
    })
  });
});

Rhum.run();

Deno.test({
  name: "Stop the server",
  async fn() {
    console.log('hmm')
    try {
      WSServer.close();
    } catch (error) {
      // Do nothing
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
