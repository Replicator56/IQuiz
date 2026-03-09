import {
  fetchCategories,
  createQuiz,
  submitAnswerForAttempt,
  finishQuiz,
} from "../services/quizService.js";

export async function getCategories(req, res) {
  try {
    const categories = await fetchCategories();
    res.status(200).json(categories);
  } catch (error) {
    console.error("GET /categories error:", error);
    res.status(500).json({ error: "Impossible de charger les catégories." });
  }
}

export async function startQuiz(req, res) {
  try {
    const result = await createQuiz(req.body);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === "CATEGORY_REQUIRED") {
      return res.status(400).json({ error: "Catégorie requise." });
    }

    if (error.message === "NOT_ENOUGH_QUESTIONS") {
      return res.status(400).json({ error: "Pas assez de questions pour démarrer le quiz." });
    }

    res.status(500).json({ error: "Impossible de démarrer le quiz." });
  }
}

export async function submitAnswer(req, res) {
  try {
    const result = await submitAnswerForAttempt({
      attemptId: req.params.attemptId,
      questionId: req.body.questionId,
      answerIds: req.body.answerIds,
    });

    res.status(200).json(result);
  } catch (error) {
    if (error.message === "NO_ANSWER_SELECTED") {
      return res.status(400).json({ error: "Au moins une réponse doit être sélectionnée." });
    }

    if (error.message === "ATTEMPT_NOT_FOUND") {
      return res.status(404).json({ error: "Tentative introuvable." });
    }

    if (error.message === "ATTEMPT_ALREADY_FINISHED") {
      return res.status(400).json({ error: "Le quiz est déjà terminé." });
    }

    if (error.message === "QUESTION_NOT_IN_ATTEMPT") {
      return res.status(400).json({ error: "Cette question n'appartient pas à cette tentative." });
    }

    if (error.message === "QUESTION_ALREADY_ANSWERED") {
      return res.status(400).json({ error: "Cette question a déjà reçu une réponse." });
    }

    if (error.message === "QUESTION_NOT_FOUND") {
      return res.status(404).json({ error: "Question introuvable." });
    }

    if (error.message === "INVALID_ANSWER_FOR_QUESTION") {
      return res.status(400).json({ error: "Réponse invalide pour cette question." });
    }

    res.status(500).json({ error: "Impossible de corriger la réponse." });
  }
}

export async function endQuiz(req, res) {
  try {
    const result = await finishQuiz({
      attemptId: req.params.attemptId,
    });

    res.status(200).json(result);
  } catch (error) {
    if (error.message === "ATTEMPT_NOT_FOUND") {
      return res.status(404).json({ error: "Tentative introuvable." });
    }

    if (error.message === "ATTEMPT_ALREADY_FINISHED") {
      return res.status(400).json({ error: "Le quiz est déjà terminé." });
    }

    res.status(500).json({ error: "Impossible de terminer le quiz." });
  }
}