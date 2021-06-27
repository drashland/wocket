import { deferred } from "./deps.ts"

export const fakeClientSocket = () => {
  return {
    send: () => {
      return true
    },
    close: () => {
      return true
    },
  } as unknown as WebSocket;
};

/**
 * Will wait until the client has opened a connection to the server,
 * so you easily create a new client, call this fn (in 1 line of code)
 * and then on, do your usual stuff
 * 
 * @param client - The client websocket
 */
export const waitForClientToOpen = async (client: WebSocket): Promise<void> => {
  const p = deferred()
  client.onopen = () => p.resolve()
  await p
}

export const connectToChannels = async (client: WebSocket, channels: string[]) => {
  const defs = new Array(channels.length).fill(deferred())
  client.send(JSON.stringify({
    connect_to: channels
  }))
  let msgCount = 0
  client.onmessage = () => {
    msgCount++
    defs[msgCount - 1].resolve()
  }
  for (const def of defs) {
    await def
  }
}

export const closeClient = async (client: WebSocket) => {
  const p = deferred()
  client.onclose = () => p.resolve()
  await p
}

export const closeClients = async (...clients: WebSocket[]) => {
  for (const client of clients) {
    await closeClient(client)
  }
}

export const waitForMsg = async (client: WebSocket): Promise<unknown> => {
  const p = deferred()
  client.onmessage = (event) => {
    const message = { event }
    p.resolve(message)
  }
  const message = await p
  return message
}


