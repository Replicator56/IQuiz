import express from "express";
import quizRoutes from "./routes/quizRoutes.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ message: "API IQuiz OK" });
});

app.use("/api", quizRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route introuvable." });
});

export default app;