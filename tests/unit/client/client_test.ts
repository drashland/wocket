import {deferred, Rhum} from "../../deps.ts";
import { Server } from "../../../src/server/server.ts";
import {WocketClient} from "../../../src/client/client.ts";

const configs = {
  hostname: "localhost",
  port: 1447
}

// const server = new Server()
// await server.run(configs)
// const p = deferred()
// server.on("chat", (packet) => {
//   p.resolve()
// })
// const client = new WocketClient(configs)
// await client.connect()
// client.connectTo(["chat"])
// client.to("chat", {
//   data: "hee"
// })
// await p
// await client.close()
// await server.close()

Rhum.testPlan("tests/unit/client/client_test.ts", () => {
  Rhum.testSuite("connect()", () => {
    Rhum.testCase("It should throw an error when no channels are passed in", async () => {
      const server = new Server()
      await server.run(configs)
      const c = new WocketClient()
      let errored = false
      let msg = ""
      try {
        await c.connect({
          hostname: "localhost",
          port: 1447,
          protocol: "ws"
        }, [])
      } catch (err) {
        errored = true
        msg = err.message
      }
      await c.close()
      await server.close()
      Rhum.asserts.assertEquals(errored, true)
      Rhum.asserts.assertEquals(msg, "You must specify channels to connect to.")
    })
    Rhum.testCase("It should throw an error when passed in channel(s) do not exist", async () => {
      const server = new Server()
      await server.run(configs)
      const c = new WocketClient()
      let errored = false
      let msg = ""
      try {
        await c.connect({
          hostname: "localhost",
          port: 1447,
          protocol: "ws"
        }, ["idontexist"])
      } catch (err) {
        errored = true
        msg = err.message
      }
      await c.close()
      await server.close()
      Rhum.asserts.assertEquals(errored, true)
      Rhum.asserts.assertEquals(msg, "Channel \"idontexist\" does not exist. You must open this on your server.")
    })
    Rhum.testCase("Should connect to the server", async () => {
      const server = new Server()
      await server.run(configs)
      server.on("chat", (packet) => {})
      const c = new WocketClient()
      await c.connect({
        hostname: "localhost",
        port: 1447,
        protocol: "ws"
      }, ["chat"])
      Rhum.asserts.assertEquals(c.websocket!.readyState, 1)
      await c.close()
      await server.close()
    })
    Rhum.testCase("It should set the hostname to 'localhost' by default", async () => {
      const server = new Server()
      await server.run(configs)
      server.on("chat", (packet) => {})
      const c = new WocketClient()
      await c.connect({
        port: 1447,
        protocol: "ws"
      }, ["chat"])
      Rhum.asserts.assertEquals(c.websocket!.readyState, 1)
      await c.close()
      await server.close()
    })
    Rhum.testCase("It should set the protocol to  'ws' by default", async () => {
      const server = new Server()
      await server.run(configs)
      server.on("chat", (packet) => {})
      const c = new WocketClient()
      await c.connect({
        hostname: "localhost",
        port: 1447,
      }, ["chat"])
      Rhum.asserts.assertEquals(c.websocket!.readyState, 1)
      await c.close()
      await server.close()
    })
  })
  Rhum.testSuite("on()", () => {
    Rhum.testCase("Should register a listener and handle events for that channel", async () => {
      const server = new Server()
      await server.run(configs)
      server.on("chat", (packet) => {})
      server.on("users", (packet) => {})
      const c = new WocketClient()
      await c.connect({
        hostname: "localhost",
        port: 1447,
        protocol: "ws"
      }, ["chat"])
      const p = deferred()
      c.on("chat", (data) => {
        p.resolve(data)
      })
      Rhum.asserts.assertEquals(!!c.listeners["chat"], true)
      server.to("chat", {
        d: "dd"
      })
      await p
      const message = await p
      Rhum.asserts.assertEquals(message, {
        d: "dd"
      })
      await c.close()
      await server.close()
    })
  })
  Rhum.testSuite("to()", () => {
    Rhum.testCase("It should send a message to the socket server when connected to the channel", async () => {
      const server = new Server()
      await server.run(configs)
      const p = deferred()
      server.on("chat", (packet) => {
        p.resolve(packet.message)
      })
      const c = new WocketClient()
      await c.connect({
        hostname: "localhost",
        port: 1447,
        protocol: "ws"
      }, ["chat"])
      c.to("chat", {
        d: "diggery doo"
      })
      const message = await p
      Rhum.asserts.assertEquals(message, {
        d: "diggery doo"
      })
      await c.close()
      await server.close()
    })
  })
  Rhum.testSuite("close()", () => {
    Rhum.testCase("Should close the connection to the server", async () => {
      const server = new Server()
      await server.run(configs)
      server.on("chat", (packet) => {})
      const c = new WocketClient()
      await c.connect({
        hostname: "localhost",
        port: 1447,
        protocol: "ws"
      }, ["chat"])
      Rhum.asserts.assertEquals(c.websocket!.readyState, 1)
      await c.close()
      Rhum.asserts.assertEquals(c.websocket!.readyState, 3)
      await server.close()
    })
  })
});

Rhum.run();
