import { Packet, Server } from "../../../mod.ts";
import { deferred, Rhum, WebSocket } from "../../deps.ts";
const decoder = new TextDecoder();

interface ResolvableMethods<T> {
  resolve: (value?: T | PromiseLike<T>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reject: (reason?: any) => void;
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
  WSServer.to("chan1", packet.message);
});

// Set up the chan1 channel
WSServer.openChannel("chan1");
WSServer.on("chan1", (packet: Packet) => {
  WSServer.to("chan1", packet.message);
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
      const promise = deferred();
      const WSClient = new WebSocket(
        `ws://${WSServer.hostname}:${WSServer.port}`,
      );
      WSClient.onopen = function () {
        WSClient.send(JSON.stringify({
          connect_to: ["chan1"],
        }));
      };
      WSClient.onmessage = function (message: any) {
        Rhum.asserts.assertEquals(message.data, "Connected to chan1.");
        WSClient.close();
      };
      WSClient.onclose = function () {
        promise.resolve();
      };
      await promise;
    });
    Rhum.testCase(
      "should allow messages to be sent back and forth, after connecting to a channel",
      async () => {
        const promise = deferred();
        const WSClient = new WebSocket(
          `ws://${WSServer.hostname}:${WSServer.port}`,
        );
        WSClient.onopen = function () {
          WSClient.send(JSON.stringify({
            connect_to: ["chan1"],
          }));
          WSClient.send(JSON.stringify({
            send_packet: {
              to: "chan1",
              message: "Hi server :)",
            },
          }));
        };
        let messageCount = 0;
        WSClient.onmessage = function (message: any) {
          messageCount++;
          if (messageCount === 2) {
            Rhum.asserts.assertEquals(JSON.parse(message.data), {
              from: "Server",
              to: "chan1",
              message: "Hi server :)",
            });
            WSClient.close();
          }
        };
        WSClient.onclose = function () {
          promise.resolve();
        };
        await promise;
      },
    );
    // Rhum.testCase("Cannot send messages to channels a user hasn't connected to", async () => {
    //   const promise = deferred();
    //   const WSClient1 = new WebSocket(
    //       `ws://${WSServer.hostname}:${WSServer.port}`,
    //   );
    //   const WSClient2 = new WebSocket(
    //       `ws://${WSServer.hostname}:${WSServer.port}`,
    //   );
    //   // Have one client connected so we can ensure they dont get a message
    //   WSClient1.onopen = function () {
    //     WSClient1.send(JSON.stringify({
    //       connect_to: ["chan1"]
    //     }));
    //   }
    //   WSClient2.onopen = function () {
    //     WSClient2.send(JSON.stringify({
    //       send_packet: {
    //         to: "chan1",
    //         message: "This message was sent from the client, but the client shouldn't be allowed to do this"
    //       },
    //     }));
    //   };
    //   WSClient2.onmessage = function (message) {
    //     Rhum.asserts.assertEquals(message.data, 'Client 9 is not connected to chan1');
    //     WSClient2.close();
    //   };
    //   WSClient1.onmessage = function (message) {
    //     console.log('ws client 1 got message')
    //     console.log(message)
    //     WSClient1.close()
    //   }
    //   WSClient1.onclose = function () {
    //     promise.resolve();
    //   };
    //   await promise;
    // })
    Rhum.testCase(
      "Does not allow connecting and sending a message to a channel that isn't opened",
      async () => {
        const promise = deferred();
        const WSClient = new WebSocket(
          `ws://${WSServer.hostname}:${WSServer.port}`,
        );
        WSClient.onopen = function () {
          WSClient.send(JSON.stringify({
            connect_to: ["chan2"],
          }));
          WSClient.send(JSON.stringify({
            send_packet: {
              to: "chan2",
              message: "Message to chan2 from client",
            },
          }));
        };
        let messageCount = 0;
        WSClient.onmessage = function (message: any) {
          messageCount++;
          if (messageCount === 1) {
            Rhum.asserts.assertEquals(
              message.data,
              'Channel \"chan2\" does not exist.',
            );
          } else {
            Rhum.asserts.assertEquals(
              message.data,
              "Client 8 is not connected to chan2",
            );
            WSClient.close();
          }
        };
        WSClient.onclose = function () {
          promise.resolve();
        };
        await promise;
      },
    );
  });
});

Rhum.run();

Deno.test({
  name: "Stop the server",
  async fn() {
    try {
      WSServer.close();
    } catch (error) {
      // Do nothing
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
