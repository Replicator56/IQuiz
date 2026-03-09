import {
  fetchCategories,
  createQuiz,
  checkAnswer,
} from "../services/quizService.js";

export async function getCategories(req, res) {
  try {
    const categories = await fetchCategories();
    res.status(200).json(categories);
  } catch (error) {
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

    if (error.message === "INVALID_PARAMS") {
      return res.status(400).json({ error: "Paramètres de démarrage invalides." });
    }

    if (error.message === "NOT_ENOUGH_QUESTIONS") {
      return res.status(400).json({ error: "Pas assez de questions pour démarrer le quiz." });
    }

    res.status(500).json({ error: "Impossible de démarrer le quiz." });
  }
}

export async function submitAnswer(req, res) {
  try {
    const result = await checkAnswer(req.body);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === "NO_ANSWER_SELECTED") {
      return res.status(400).json({ error: "Au moins une réponse doit être sélectionnée." });
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