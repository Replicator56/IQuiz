import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./config/database.js";
import quizRoutes from "./routes/quizRoutes.js";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONT_PATH = path.join(__dirname, "../../front");
const HOME_PATH = path.join(FRONT_PATH, "home.html");

pool.connect()
  .then(() => console.log("Connexion PostgreSQL OK"))
  .catch((err) => console.error("Erreur DB", err));

app.use(express.json());
app.use(express.static(FRONT_PATH));

app.use("/api", quizRoutes);

app.get("/", (req, res) => {
  res.sendFile(HOME_PATH);
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});