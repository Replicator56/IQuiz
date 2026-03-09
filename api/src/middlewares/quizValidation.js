function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

export function validateStartQuiz(req, res, next) {
  const { readingMode, gameMode, categoryId } = req.body;

  const allowedReadingModes = ["normal", "falc"];
  const allowedGameModes = ["practice", "exam"];

  if (!isNonEmptyString(readingMode) || !allowedReadingModes.includes(readingMode)) {
    return res.status(400).json({
      error: "readingMode invalide. Valeurs autorisées : normal, falc.",
    });
  }

  if (!isNonEmptyString(gameMode) || !allowedGameModes.includes(gameMode)) {
    return res.status(400).json({
      error: "gameMode invalide. Valeurs autorisées : practice, exam.",
    });
  }

  if (gameMode === "practice") {
    const normalizedCategoryId = Number(categoryId);

    if (!isPositiveInteger(normalizedCategoryId)) {
      return res.status(400).json({
        error: "categoryId est obligatoire en mode practice et doit être un entier positif.",
      });
    }

    req.body.categoryId = normalizedCategoryId;
  }

  next();
}

export function validateSubmitAnswer(req, res, next) {
  const { questionId, answerIds } = req.body;
  const { attemptId } = req.params;

  if (!isNonEmptyString(attemptId)) {
    return res.status(400).json({
      error: "attemptId invalide.",
    });
  }

  const normalizedQuestionId = Number(questionId);

  if (!isPositiveInteger(normalizedQuestionId)) {
    return res.status(400).json({
      error: "questionId doit être un entier positif.",
    });
  }

  if (!Array.isArray(answerIds) || answerIds.length === 0) {
    return res.status(400).json({
      error: "answerIds doit être un tableau non vide.",
    });
  }

  const normalizedAnswerIds = answerIds.map(Number);

  if (
    normalizedAnswerIds.some((answerId) => !isPositiveInteger(answerId))
  ) {
    return res.status(400).json({
      error: "Chaque élément de answerIds doit être un entier positif.",
    });
  }

  req.body.questionId = normalizedQuestionId;
  req.body.answerIds = [...new Set(normalizedAnswerIds)];

  next();
}

export function validateFinishQuiz(req, res, next) {
  const { attemptId } = req.params;

  if (!isNonEmptyString(attemptId)) {
    return res.status(400).json({
      error: "attemptId invalide.",
    });
  }

  next();
}