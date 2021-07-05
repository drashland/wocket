import { Client, EventEmitter } from "../../mod.ts";
import { deferred, Rhum, WebSocket } from "../deps.ts";
import * as TestHelpers from "../test_helpers.ts";

Rhum.testPlan("unit/event_emitter_test.ts", () => {
  Rhum.testSuite("constructor()", () => {
    Rhum.testCase(
      "should have Channels, Clients, and Sender on class init",
      () => {
        class EE extends EventEmitter {
          eventHandler() {}
        }
        const io = new EE("hello there");
        Rhum.asserts.assertEquals(io.name, "hello there");
      },
    );
  });

  // Commented out because this method doesnt seem to exist anymore, but kept for reference
  // Rhum.testSuite("createClient()", () => {
  //   Rhum.testCase("should connect a client", () => {
  //     const io = new EventEmitter();
  //     const clientSocket = ClientSocket() as unknown as WebSocket;
  //     const client = io.createClient(1, clientSocket);
  //     const connectedClients = io.getClients();
  //     Rhum.asserts.assertEquals(
  //       connectedClients[client.id].socket,
  //       clientSocket,
  //     );
  //   });
  // });

  // Commented out because this method doesnt seem to exist anymore, but kept for reference
  // Rhum.testSuite("addClientToChannel()", () => {
  //   Rhum.testCase(
  //     "should register which clients are listening to what channel",
  //     () => {
  //       const io = new EventEmitter();
  //       const client1 = io.createClient(
  //         1337,
  //         ClientSocket() as unknown as WebSocket,
  //       );
  //       io.on("chat", () => {});
  //       io.addClientToChannel("chat", client1.id);
  //       Rhum.asserts.assert(io.getChannel("chat").listeners.has(1337));
  //       Rhum.asserts.assertEquals(io.getChannel("chat").listeners.size, 1);

  //       const client2 = io.createClient(
  //         1447,
  //         ClientSocket() as unknown as WebSocket,
  //       );
  //       io.addClientToChannel("chat", client2.id);
  //       Rhum.asserts.assertEquals(io.getChannel("chat").listeners.size, 2);
  //     },
  //   );
  //   Rhum.testCase("Creates the channel if it doesn't already exist", () => {
  //     const io = new EventEmitter();
  //     Rhum.asserts.assertEquals(io.channels["chat"], undefined);
  //     io.on("chat", () => {});
  //     const client1 = io.createClient(
  //       1337,
  //       ClientSocket() as unknown as WebSocket,
  //     );
  //     io.addClientToChannel("chat", client1.id);
  //     Rhum.asserts.assertEquals(io.channels["chat"].name, "chat");
  //   });
  //   Rhum.testCase(
  //     "Throws an error when the client is already connected to the channel",
  //     () => {
  //       const io = new EventEmitter();
  //       Rhum.asserts.assertEquals(io.channels["chat"], undefined);
  //       const client1 = io.createClient(
  //         1337,
  //         ClientSocket() as unknown as WebSocket,
  //       );
  //       io.on("chat", () => {});
  //       io.addClientToChannel("chat", client1.id);
  //       const err = {
  //         thrown: false,
  //         msg: "",
  //       };
  //       try {
  //         io.addClientToChannel("chat", client1.id);
  //       } catch (error) {
  //         err.thrown = true;
  //         err.msg = error.message;
  //       }
  //       Rhum.asserts.assertEquals(err, {
  //         thrown: true,
  //         msg: "Already listening to chat.",
  //       });
  //     },
  //   );
  // });

  Rhum.testSuite("broadcast()", () => {
    Rhum.testCase("Should call the event", async () => {
      class EE extends EventEmitter {
        eventHandler() {}
      }
      const eventEmitter = new EE("JJ");
      const p = deferred();
      eventEmitter.addEventListener("yeet", () => {
        p.resolve();
      });
      const event = new Event("yeet");
      eventEmitter.broadcast(event);
      await p;
    });
    // If we get here, then the event was called :)
  });

  // Commented out because this method doesnt seem to exist anymore, but kept for reference
  // Rhum.testSuite("closeChannel()", () => {
  //   Rhum.testCase("Removes the channel", async () => {
  //     // Set up
  //     const io = new EventEmitter();
  //     const client = io.createClient(
  //       1337,
  //       ClientSocket() as unknown as WebSocket,
  //     );

  //     io.on("My channel", () => {});
  //     await io.addClientToChannel("My channel", client.id);
  //     // Make sure the channel is set up so we know our tests work
  //     const channel = io.getChannel("My channel");
  //     Rhum.asserts.assertEquals(channel.name, "My channel");
  //     // Now test properly
  //     io.closeChannel("My channel");
  //     Rhum.asserts.assertEquals(io.getChannel("My channel"), undefined);
  //   });
  // });

  // Commented out because this method doesnt seem to exist anymore, but kept for reference
  // Rhum.testSuite("getClients()", () => {
  //   Rhum.testCase("Returns all of the 'connected' clients", () => {
  //     const io = new EventEmitter();
  //     io.createClient(1337, ClientSocket() as unknown as WebSocket);
  //     io.createClient(1338, ClientSocket() as unknown as WebSocket);
  //     const clients = io.getClients();
  //     Rhum.asserts.assertEquals(!!clients["1337"], true);
  //     Rhum.asserts.assertEquals(!!clients["1338"], true);
  //   });
  //   Rhum.testCase("Returns empty when no clients exist", () => {
  //     const io = new EventEmitter();
  //     Rhum.asserts.assertEquals(io.getClients(), {});
  //   });
  // });

  // Commented out because this method doesnt seem to exist anymore, but kept for reference#
  // Rhum.testSuite("getChannel()", () => {
  //   Rhum.testCase("Returns the channel when it exists", () => {
  //     const io = new EventEmitter();
  //     io.on("My channel", () => {});
  //     io.createClient(1337, ClientSocket() as unknown as WebSocket);
  //     io.addClientToChannel("My channel", 1337);
  //     const channel = io.getChannel("My channel");
  //     Rhum.asserts.assertEquals(channel.name, "My channel");
  //   });
  //   Rhum.testCase("Returns undefined when the channel does not exist", () => {
  //     const io = new EventEmitter();
  //     io.createClient(1337, ClientSocket() as unknown as WebSocket);
  //     const channel = io.getChannel("I dont exist");
  //     Rhum.asserts.assertEquals(channel, undefined);
  //   });
  // });

  // Commented out because this method doesnt seem to exist anymore, but kept for reference
  // Rhum.testSuite("getChannels()", () => {
  //   Rhum.testCase("Returns an empty array when no channels exist", () => {
  //     const io = new EventEmitter();
  //     const channels = io.getChannels();
  //     Rhum.asserts.assertEquals(channels.length, 0);
  //   });
  //   Rhum.testCase("Returns the list of channels when channels exist", () => {
  //     const io = new EventEmitter();
  //     io.on("My channel", () => {});
  //     io.on("another channel", () => {});
  //     const channels = io.getChannels();
  //     Rhum.asserts.assertEquals(channels.length, 2);
  //   });
  //   Rhum.testCase(
  //     "Does not return channels where the name is a reserved event name",
  //     () => {
  //       const io = new EventEmitter();
  //       io.on("my channel", () => {});
  //       io.on("connect", () => {});
  //       const channels = io.getChannels();
  //       Rhum.asserts.assertEquals(channels.length, 1);
  //     },
  //   );
  // });

  // Commented out because this method doesnt seem to exist anymore, but kept for reference
  // Rhum.testSuite("on()", () => {
  //   Rhum.testCase("Creates a channel when it doesn't already exist", () => {
  //     const io = new EventEmitter();
  //     io.on("My channel", () => {});
  //     Rhum.asserts.assertEquals(io.channels["My channel"].name, "My channel");
  //   });
  //   Rhum.testCase("Throws ann error when that channel already exists", () => {
  //     const io = new EventEmitter();
  //     io.on("My channel", () => {});
  //     const err = {
  //       thrown: false,
  //       msg: "",
  //     };
  //     try {
  //       io.on("My channel", () => {});
  //     } catch (error) {
  //       err.thrown = true;
  //       err.msg = error.message;
  //     }
  //     Rhum.asserts.assertEquals(err, {
  //       thrown: true,
  //       msg: 'Channel "My channel" already exists!',
  //     });
  //   });
  //   Rhum.testCase("should add channels for server to listen to", () => {
  //     const io = new EventEmitter();
  //     const expect = ["chat", "room"];
  //     io.on("chat", () => true);
  //     io.on("room", () => true);

  //     const channels = io.getChannels();
  //     Rhum.asserts.assertEquals(expect, channels);
  //   });
  //   Rhum.testCase(
  //     "should detect same channel name and push cb into callbacks array of channel",
  //     () => {
  //       const io = new EventEmitter();
  //       const expect = ["chat"];
  //       io.on("chat", () => true);

  //       const channels = io.getChannels();
  //       Rhum.asserts.assertEquals(expect, channels);
  //       Rhum.asserts.assertEquals(Object.keys(channels).length, expect.length);
  //       Rhum.asserts.assertEquals(io.getChannel("chat").callbacks.length, 1);
  //     },
  //   );
  //   Rhum.testCase("Should create the channel if it doesn't exist", () => {
  //     const io = new EventEmitter();
  //     io.on("something", () => true);
  //     Rhum.asserts.assertEquals(io.channels["something"].name, "something");
  //   });
  // });

  // Commented out because this method doesnt seem to exist anymore, but kept for reference
  // Rhum.testSuite("removeClient()", () => {
  //   Rhum.testCase("should remove client", async () => {
  //     const io = new EventEmitter();
  //     const clientId = 1;
  //     const clientSocket = ClientSocket() as unknown as WebSocket;
  //     await io.removeClient(clientId);
  //     const connectedClients = io.getClients();
  //     Rhum.asserts.assertEquals(connectedClients, []);

  //     const newClient = io.createClient(2, clientSocket);
  //     Rhum.asserts.assertEquals(
  //       connectedClients[newClient.id].socket,
  //       clientSocket,
  //     );
  //   });
  //   Rhum.testCase(
  //     "should remove client from channels[channelName].listeners",
  //     async () => {
  //       const io = new EventEmitter();
  //       io.on("chat", () => {});
  //       const client1 = io.createClient(
  //         1,
  //         ClientSocket() as unknown as WebSocket,
  //       );
  //       io.addClientToChannel("chat", client1.id);
  //       const client2 = io.createClient(
  //         2,
  //         ClientSocket() as unknown as WebSocket,
  //       );
  //       io.addClientToChannel("chat", client2.id);
  //       await io.removeClient(2);
  //       const clientsConnected = io.getClients();
  //       Rhum.asserts.assert(!clientsConnected[2]);
  //       Rhum.asserts.assertEquals(io.getChannel("chat").listeners.size, 1);
  //     },
  //   );
  //   Rhum.testCase(
  //     "Should do nothing if the client does not exist",
  //     async () => {
  //       const io = new EventEmitter();
  //       const client1 = io.createClient(
  //         1,
  //         ClientSocket() as unknown as WebSocket,
  //       );
  //       Rhum.asserts.assertEquals(io.clients[1].id, 1);
  //       Rhum.asserts.assertEquals(io.clients[2], undefined);
  //       await io.removeClient(2);
  //       Rhum.asserts.assertEquals(io.clients[1].id, 1);
  //       Rhum.asserts.assertEquals(io.clients[2], undefined);
  //     },
  //   );
  // });

  // Commented out because this method doesnt seem to exist anymore, but kept for reference
  // Rhum.testSuite("removeClientFromChannel()", () => {
  //   Rhum.testCase("Throws an error when the channel doesn't exist", () => {
  //     const io = new EventEmitter();
  //     const err = {
  //       thrown: false,
  //       msg: "",
  //     };
  //     try {
  //       io.removeClientFromChannel("I dont exist", 0);
  //     } catch (error) {
  //       err.thrown = true;
  //       err.msg = error.message;
  //     }
  //     Rhum.asserts.assertEquals(err, {
  //       thrown: true,
  //       msg: 'Channel "I dont exist" not found.',
  //     });
  //   });
  //   Rhum.testCase(
  //     "Throws an error when the client id isn't connected to the channel",
  //     () => {
  //       const io = new EventEmitter();
  //       io.on("My channel", () => {});
  //       const err = {
  //         thrown: false,
  //         msg: "",
  //       };
  //       try {
  //         io.removeClientFromChannel("My channel", 0);
  //       } catch (error) {
  //         err.thrown = true;
  //         err.msg = error.message;
  //       }
  //       Rhum.asserts.assertEquals(err, {
  //         thrown: true,
  //         msg: "Not connected to My channel.",
  //       });
  //     },
  //   );
  //   Rhum.testCase("Removes the client when they are connected", () => {
  //     const io = new EventEmitter();
  //     const client1 = io.createClient(
  //       1,
  //       ClientSocket() as unknown as WebSocket,
  //     );
  //     io.on("my channel", () => {});
  //     io.addClientToChannel("my channel", client1.id);
  //     Rhum.asserts.assertEquals(io.channels["my channel"].name, "my channel");
  //     Rhum.asserts.assertEquals(
  //       io.channels["my channel"].listeners.has(1),
  //       true,
  //     );
  //     io.removeClientFromChannel("my channel", 1);
  //     Rhum.asserts.assertEquals(
  //       io.channels["my channel"].listeners.has(1),
  //       false,
  //     );
  //   });
  // });

  // Not sure if we can unit test this, might be best to leave it for integration?
  // Rhum.testSuite("to()", () => {
  //
  // })

  // private method, unable to test
  // Rhum.testSuite("queuePacket()", () =>  {
  //   Rhum.testCase("Adds a packet", () => {
  //
  //   })
  // })

  // TODO(any): This test was moved from the client test file after the solid restructure. This test needs to be updated to fit the move
  Rhum.testSuite("handlePacket()", () => {
    Rhum.testCase("dispatches the packet in an event", () => {
      const receiver = new Client(
        1,
        TestHelpers.fakeClientSocket() as unknown as WebSocket,
      );
      const sender = new Client(
        2,
        TestHelpers.fakeClientSocket() as unknown as WebSocket,
      );
      const result = receiver.handlePacket(sender, {
        message: "hella",
      });

      // We can assert that the packet was handled if the packet contains the
      // `sender` property. If a packet has the `sender` property, that means
      // the client dispatched an event -- modifying the packet within the event
      // by adding the `sender` property.
      Rhum.asserts.assertEquals(result, {
        message: "hella",
        sender: "wocket_client:2",
      });
    });
  });
});

Rhum.run();
