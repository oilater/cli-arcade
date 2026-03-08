import { startBombServer } from "./ws-server.ts"

const port = parseInt(process.env.PORT ?? "7778", 10)
startBombServer(undefined, port)
