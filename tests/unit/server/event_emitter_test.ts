import EventEmitter from "../../../src/server/event_emitter.ts";
import { test, assertEquals, assert } from "../../test.ts";

let io = new EventEmitter();

const ClientSocket = () => {
  return {
    send: () => true,
    close: () => true,
  }
};

test("should have Events, Clients, and Sender on class init", () => {
  const expect = ['events', 'clients', 'sender'];
  assert(expect.every((val) => io[val]));
});

test("should connect a client", () => {
  const clientId = 1;
  const clientSocket = ClientSocket();
  io.addClient(clientSocket, clientId);
  const connectedClients = io.getClients();
  assertEquals(connectedClients[clientId].socket, clientSocket);
});

test("should remove client", async () => {
  const clientId = 1;
  const clientSocket = ClientSocket();
  await io.removeClient(clientId);
  const connectedClients = io.getClients();
  assertEquals(connectedClients, []);

  const newClientId = 2;
  io.addClient(clientSocket, newClientId);
  assertEquals(connectedClients[newClientId].socket, clientSocket);
});

test("should add events for server to listen to", () => {
  const expect = ['chat', 'room'];
  io.on('chat', () => true);
  io.on('room', () => true);

  const events = io.getEvents();
  assert(expect.every((val) => events[val]));
});

test("should detect same event name and push cb into callbacks array of event", () => {
  const expect = ['chat', 'room'];
  io.on('chat', () => true);

  const events = io.getEvents();
  assert(expect.every((val) => events[val]));
  assertEquals(Object.keys(events).length, expect.length);
  assertEquals(events['chat'].callbacks.length, 2);
});

test("should register which clients are listening to what event", () => {
  const expect = ['chat', 'room'];
  io.addListener('chat', 2);
  const events = io.getEvents();
  assert(events['chat'].listeners.has(2));
  
  const newClientId = 3;
  const clientSocket = ClientSocket();
  io.addClient(clientSocket, newClientId);
  io.addListener('chat', newClientId);
  assertEquals(events['chat'].listeners.size, 2);
});

test("should remove client from events[type].listeners", async () => {
  await io.removeClient(2);
  const clientsConnected = io.getClients();
  const events = io.getEvents();
  assert(!clientsConnected[2])
  assertEquals(events['chat'].listeners.size, 1);
});