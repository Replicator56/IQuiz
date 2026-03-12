import express from "express"
import path from "path"
import { fileURLToPath } from "url"

const app = express()
const PORT = 3000

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FRONT_PATH = path.join(__dirname, "../../front")
const HOME_PATH = path.join(FRONT_PATH, "home.html")

console.log("SERVER FILE USED:", import.meta.url)
console.log("__dirname =", __dirname)
console.log("FRONT_PATH =", FRONT_PATH)
console.log("HOME_PATH =", HOME_PATH)

app.use(express.static(FRONT_PATH))

app.get("/", (req, res) => {
  res.sendFile(HOME_PATH)
})

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`)
})