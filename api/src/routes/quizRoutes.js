import express from "express";
import {
  getCategories,
  startQuiz,
  submitAnswer,
} from "../controllers/quizController.js";

const router = express.Router();

router.get("/categories", getCategories);
router.post("/quiz/start", startQuiz);
router.post("/quiz/answer", submitAnswer);

export default router;