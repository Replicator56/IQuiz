import { randomUUID } from "crypto";
import { categories } from "../mocks/categories.mock.js";
import { questions } from "../mocks/questions.mock.js";
import { attempts } from "../mocks/attempts.mock.js";

export async function fetchCategories() {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createQuiz({ readingMode, gameMode, categoryId }) {
  const allowedReadingModes = ["normal", "falc"];
  const allowedGameModes = ["practice", "exam"];

  if (
    !allowedReadingModes.includes(readingMode) ||
    !allowedGameModes.includes(gameMode)
  ) {
    throw new Error("INVALID_PARAMS");
  }

  if (gameMode === "practice" && !categoryId) {
    throw new Error("CATEGORY_REQUIRED");
  }

  const nbQuestions = gameMode === "practice" ? 4 : 10;

  const filteredQuestions =
    gameMode === "practice"
      ? questions.filter((question) => question.categoryId === Number(categoryId))
      : questions;

  if (filteredQuestions.length < nbQuestions) {
    throw new Error("NOT_ENOUGH_QUESTIONS");
  }

  const selectedQuestions = shuffleArray(filteredQuestions).slice(0, nbQuestions);
  const attemptId = randomUUID();

  attempts.push({
    id: attemptId,
    readingMode,
    gameMode,
    categoryId: categoryId ? Number(categoryId) : null,
    questionIds: selectedQuestions.map((question) => question.id),
    answers: [],
    status: "in_progress",
    createdAt: new Date().toISOString(),
  });

  return {
    attemptId,
    total: nbQuestions,
    questions: selectedQuestions.map((question) => ({
      id: question.id,
      text:
        readingMode === "falc"
          ? question.questionFalc
          : question.questionNormal,
      answers: shuffleArray(
        question.answers.map((answer) => ({
          id: answer.id,
          text: answer.text,
        }))
      ),
    })),
  };
}

export async function submitAnswerForAttempt({ attemptId, questionId, answerIds }) {
  if (!attemptId || !questionId || !Array.isArray(answerIds)) {
    throw new Error("INVALID_PARAMS");
  }

  if (answerIds.length === 0) {
    throw new Error("NO_ANSWER_SELECTED");
  }

  const normalizedQuestionId = Number(questionId);
  const normalizedAnswerIds = [...new Set(answerIds.map(Number))];

  if (
    Number.isNaN(normalizedQuestionId) ||
    normalizedAnswerIds.some(Number.isNaN)
  ) {
    throw new Error("INVALID_PARAMS");
  }

  const attempt = attempts.find((item) => item.id === attemptId);

  if (!attempt) {
    throw new Error("ATTEMPT_NOT_FOUND");
  }

  if (attempt.status === "finished") {
    throw new Error("ATTEMPT_ALREADY_FINISHED");
  }

  if (!attempt.questionIds.includes(normalizedQuestionId)) {
    throw new Error("QUESTION_NOT_IN_ATTEMPT");
  }

  const alreadyAnswered = attempt.answers.some(
    (answer) => answer.questionId === normalizedQuestionId
  );

  if (alreadyAnswered) {
    throw new Error("QUESTION_ALREADY_ANSWERED");
  }

  const question = questions.find((item) => item.id === normalizedQuestionId);

  if (!question) {
    throw new Error("QUESTION_NOT_FOUND");
  }

  const validAnswerIds = question.answers.map((answer) => answer.id);

  const hasInvalidAnswer = normalizedAnswerIds.some(
    (answerId) => !validAnswerIds.includes(answerId)
  );

  if (hasInvalidAnswer) {
    throw new Error("INVALID_ANSWER_FOR_QUESTION");
  }

  const correctAnswerIds = question.answers
    .filter((answer) => answer.isCorrect)
    .map((answer) => answer.id)
    .sort((a, b) => a - b);

  const sortedUserAnswerIds = [...normalizedAnswerIds].sort((a, b) => a - b);

  const ok =
    sortedUserAnswerIds.length === correctAnswerIds.length &&
    sortedUserAnswerIds.every(
      (answerId, index) => answerId === correctAnswerIds[index]
    );

  attempt.answers.push({
    questionId: normalizedQuestionId,
    answerIds: sortedUserAnswerIds,
    ok,
  });

  return {
    ok,
    correctAnswerIds,
    explanation: question.explanation,
    answeredQuestions: attempt.answers.length,
    totalQuestions: attempt.questionIds.length,
  };
}

export async function finishQuiz({ attemptId }) {
  if (!attemptId) {
    throw new Error("INVALID_PARAMS");
  }

  const attempt = attempts.find((item) => item.id === attemptId);

  if (!attempt) {
    throw new Error("ATTEMPT_NOT_FOUND");
  }

  if (attempt.status === "finished") {
    throw new Error("ATTEMPT_ALREADY_FINISHED");
  }

  const corrections = attempt.questionIds.map((questionId) => {
    const question = questions.find((item) => item.id === questionId);
    const userAnswer = attempt.answers.find((item) => item.questionId === questionId);

    const correctAnswerIds = question.answers
      .filter((answer) => answer.isCorrect)
      .map((answer) => answer.id)
      .sort((a, b) => a - b);

    return {
      questionId,
      ok: userAnswer ? userAnswer.ok : false,
      userAnswerIds: userAnswer ? userAnswer.answerIds : [],
      correctAnswerIds,
      explanation: question.explanation,
    };
  });

  const score = corrections.filter((item) => item.ok).length;

  attempt.status = "finished";
  attempt.finishedAt = new Date().toISOString();

  return {
    attemptId: attempt.id,
    score,
    total: attempt.questionIds.length,
    corrections,
  };
}

function shuffleArray(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}