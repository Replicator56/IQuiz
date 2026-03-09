import express from "express";
import {
  getCategories,
  startQuiz,
  submitAnswer,
  endQuiz,
} from "../controllers/quizController.js";
import {
  validateStartQuiz,
  validateSubmitAnswer,
  validateFinishQuiz,
} from "../middlewares/quizValidation.js";

const router = express.Router();

router.get("/categories", getCategories);
router.post("/quiz/start", validateStartQuiz, startQuiz);
router.post("/quiz/:attemptId/answer", validateSubmitAnswer, submitAnswer);
router.post("/quiz/:attemptId/finish", validateFinishQuiz, endQuiz);

export default router;