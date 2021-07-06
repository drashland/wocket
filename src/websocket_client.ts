import { deferred } from "../tests/deps.ts"

type Callback = (message: Record<string, unknown>) => void

export class WebSocketClient {
    #socket: WebSocket

    #handlers: Map<string, Callback> = new Map()

    constructor(socket: WebSocket) {
        this.#socket = socket
        // @ts-ignore
        this.#socket.onerror = (e) => { throw new Error(e.message) }
        this.#socket.onmessage = (e) => {
            const packet = JSON.parse(e.data)
            const { channel, message } = packet
            const handler = this.#handlers.get(channel)
            if (handler) {
                handler(message)
            }
        }
    }

    public static async create(url: string) {
        const websocket = new WebSocket(url)
        const p = deferred()
        websocket.onopen = () => p.resolve()
        websocket.onerror = (e) => {
            // @ts-ignore
            throw new Error(e.message)
        }
        await p;
        return new WebSocketClient(websocket)
    }

    public on<T extends Record<string, unknown>>(channelName: string, cb: (message: T) => void) {
        this.#handlers.set(channelName, cb as Callback)
    }

    public to(channelName: string, message: Record<string, unknown>) {
        const packet = JSON.stringify({
            channel: channelName,
            message
        })
        this.#socket.send(packet)
    }
}