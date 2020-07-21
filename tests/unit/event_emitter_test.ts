import { EventEmitter } from "../../src/event_emitter.ts";
import {
  assertEquals,
  assert,
  WebSocket,
  Rhum
} from "../deps.ts";

const ClientSocket = () => {
  return {
    send: () => true,
    close: () => true,
  };
};

Rhum.testPlan("unit/event_emitter_test.ts", () => {
  Rhum.testSuite("constructor()", () => {
    Rhum.testCase("should have Channels, Clients, and Sender on class init", () => {
      const io = new EventEmitter();
      const expect = ["channels", "clients", "sender"];
      assert(expect.every((val) => io.hasOwnProperty(val)));
    });
  });
  Rhum.testSuite("createClient()", () => {
    Rhum.testCase("should connect a client", () => {
      const io = new EventEmitter();
      const clientSocket = ClientSocket() as unknown as WebSocket;
      const client = io.createClient(1, clientSocket);
      const connectedClients = io.getClients();
      assertEquals(connectedClients[client.id].socket, clientSocket);
    });
  })

  Rhum.testSuite("removeClient()", () => {
    Rhum.testCase("should remove client", async () => {
      const io = new EventEmitter();
      const clientId = 1;
      const clientSocket = ClientSocket() as unknown as WebSocket;
      await io.removeClient(clientId);
      const connectedClients = io.getClients();
      assertEquals(connectedClients, []);

      const newClient = io.createClient(2, clientSocket);
      assertEquals(connectedClients[newClient.id].socket, clientSocket);
    });
  });

  Rhum.testSuite("on()", () => {
    Rhum.testCase("should add channels for server to listen to", () => {
      const io = new EventEmitter();
      const expect = ["chat", "room"];
      io.on("chat", () => true);
      io.on("room", () => true);

      const channels = io.getChannels();
      assertEquals(expect, channels);
    });
    Rhum.testCase("should detect same channel name and push cb into callbacks array of channel", () => {
      const io = new EventEmitter();
      const expect = ["chat"];
      io.on("chat", () => true);

      const channels = io.getChannels();
      assertEquals(expect, channels);
      assertEquals(Object.keys(channels).length, expect.length);
      assertEquals(io.getChannel("chat").callbacks.length, 1);
    });
  });

  Rhum.testSuite("addClientToChannel()", () => {
    Rhum.testCase("should register which clients are listening to what channel", () => {
      const io = new EventEmitter();
      const client1 = io.createClient(1337, ClientSocket() as unknown as WebSocket);
      io.addClientToChannel("chat", client1.id);
      assert(io.getChannel("chat").listeners.has(1337));
      assertEquals(io.getChannel("chat").listeners.size, 1);

      const client2 = io.createClient(1447, ClientSocket() as unknown as WebSocket);
      io.addClientToChannel("chat", client2.id);
      assertEquals(io.getChannel("chat").listeners.size, 2);
    });
  })

  Rhum.testSuite("removeClient()", () => {
    Rhum.testCase("should remove client from channels[channelName].listeners", async () => {
      const io = new EventEmitter();
      const client1 = io.createClient(1, ClientSocket() as unknown as WebSocket);
      io.addClientToChannel("chat", client1.id);
      const client2 = io.createClient(2, ClientSocket() as unknown as WebSocket);
      io.addClientToChannel("chat", client2.id);
      await io.removeClient(2);
      const clientsConnected = io.getClients();
      assert(!clientsConnected[2]);
      assertEquals(io.getChannel("chat").listeners.size, 1);
    });
  })
});

Rhum.run()
