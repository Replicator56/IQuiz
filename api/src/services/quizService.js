import { randomUUID } from "crypto";
import pool from "../config/database.js";

export async function fetchCategories() {
  const result = await pool.query(
    "SELECT id, name FROM categories ORDER BY name ASC"
  );
  return result.rows;
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

  const params = [];
  let query = `
    SELECT
      q.id,
      q.category_id,
      q.question_normal,
      q.question_falc,
      q.explanation
    FROM questions q
  `;

  if (gameMode === "practice") {
    query += ` WHERE q.category_id = $1`;
    params.push(Number(categoryId));
  }

  query += ` ORDER BY RANDOM() LIMIT ${nbQuestions}`;

  const questionsResult = await pool.query(query, params);
  const selectedQuestions = questionsResult.rows;

  if (selectedQuestions.length < nbQuestions) {
    throw new Error("NOT_ENOUGH_QUESTIONS");
  }

  const questionIds = selectedQuestions.map((question) => question.id);

  const answersResult = await pool.query(
    `
    SELECT
      id,
      question_id,
      text
    FROM answers
    WHERE question_id = ANY($1::int[])
    `,
    [questionIds]
  );

  const answersByQuestionId = new Map();

  for (const answer of answersResult.rows) {
    if (!answersByQuestionId.has(answer.question_id)) {
      answersByQuestionId.set(answer.question_id, []);
    }

    answersByQuestionId.get(answer.question_id).push({
      id: answer.id,
      text: answer.text,
    });
  }

  const attemptId = randomUUID();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      INSERT INTO attempts (id, reading_mode, game_mode, category_id, status)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        attemptId,
        readingMode,
        gameMode,
        categoryId ? Number(categoryId) : null,
        "in_progress",
      ]
    );

    for (let index = 0; index < selectedQuestions.length; index += 1) {
      await client.query(
        `
        INSERT INTO attempt_questions (attempt_id, question_id, display_order)
        VALUES ($1, $2, $3)
        `,
        [attemptId, selectedQuestions[index].id, index + 1]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return {
    attemptId,
    total: nbQuestions,
    questions: selectedQuestions.map((question) => ({
      id: question.id,
      text:
        readingMode === "falc"
          ? question.question_falc
          : question.question_normal,
      answers: shuffleArray(answersByQuestionId.get(question.id) || []),
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

  const attemptResult = await pool.query(
    `
    SELECT id, status
    FROM attempts
    WHERE id = $1
    `,
    [attemptId]
  );

  const attempt = attemptResult.rows[0];

  if (!attempt) {
    throw new Error("ATTEMPT_NOT_FOUND");
  }

  if (attempt.status === "finished") {
    throw new Error("ATTEMPT_ALREADY_FINISHED");
  }

  const attemptQuestionResult = await pool.query(
    `
    SELECT question_id
    FROM attempt_questions
    WHERE attempt_id = $1 AND question_id = $2
    `,
    [attemptId, normalizedQuestionId]
  );

  if (attemptQuestionResult.rows.length === 0) {
    throw new Error("QUESTION_NOT_IN_ATTEMPT");
  }

  const alreadyAnsweredResult = await pool.query(
    `
    SELECT 1
    FROM attempt_answers
    WHERE attempt_id = $1 AND question_id = $2
    LIMIT 1
    `,
    [attemptId, normalizedQuestionId]
  );

  if (alreadyAnsweredResult.rows.length > 0) {
    throw new Error("QUESTION_ALREADY_ANSWERED");
  }

  const questionResult = await pool.query(
    `
    SELECT id, explanation
    FROM questions
    WHERE id = $1
    `,
    [normalizedQuestionId]
  );

  const question = questionResult.rows[0];

  if (!question) {
    throw new Error("QUESTION_NOT_FOUND");
  }

  const answersResult = await pool.query(
    `
    SELECT id, is_correct
    FROM answers
    WHERE question_id = $1
    `,
    [normalizedQuestionId]
  );

  if (answersResult.rows.length === 0) {
    throw new Error("QUESTION_NOT_FOUND");
  }

  const validAnswerIds = answersResult.rows.map((answer) => answer.id);

  const hasInvalidAnswer = normalizedAnswerIds.some(
    (answerId) => !validAnswerIds.includes(answerId)
  );

  if (hasInvalidAnswer) {
    throw new Error("INVALID_ANSWER_FOR_QUESTION");
  }

  const correctAnswerIds = answersResult.rows
    .filter((answer) => answer.is_correct)
    .map((answer) => answer.id)
    .sort((a, b) => a - b);

  const sortedUserAnswerIds = [...normalizedAnswerIds].sort((a, b) => a - b);

  const ok =
    sortedUserAnswerIds.length === correctAnswerIds.length &&
    sortedUserAnswerIds.every(
      (answerId, index) => answerId === correctAnswerIds[index]
    );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const answerId of sortedUserAnswerIds) {
      await client.query(
        `
        INSERT INTO attempt_answers (attempt_id, question_id, answer_id)
        VALUES ($1, $2, $3)
        `,
        [attemptId, normalizedQuestionId, answerId]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const answeredQuestionsResult = await pool.query(
    `
    SELECT COUNT(DISTINCT question_id) AS count
    FROM attempt_answers
    WHERE attempt_id = $1
    `,
    [attemptId]
  );

  const totalQuestionsResult = await pool.query(
    `
    SELECT COUNT(*) AS count
    FROM attempt_questions
    WHERE attempt_id = $1
    `,
    [attemptId]
  );

  return {
    ok,
    correctAnswerIds,
    explanation: question.explanation,
    answeredQuestions: Number(answeredQuestionsResult.rows[0].count),
    totalQuestions: Number(totalQuestionsResult.rows[0].count),
  };
}

export async function finishQuiz({ attemptId }) {
  if (!attemptId) {
    throw new Error("INVALID_PARAMS");
  }

  const attemptResult = await pool.query(
    `
    SELECT id, status
    FROM attempts
    WHERE id = $1
    `,
    [attemptId]
  );

  const attempt = attemptResult.rows[0];

  if (!attempt) {
    throw new Error("ATTEMPT_NOT_FOUND");
  }

  if (attempt.status === "finished") {
    throw new Error("ATTEMPT_ALREADY_FINISHED");
  }

  const questionsResult = await pool.query(
    `
    SELECT
      q.id,
      q.explanation
    FROM attempt_questions aq
    JOIN questions q ON q.id = aq.question_id
    WHERE aq.attempt_id = $1
    ORDER BY aq.display_order
    `,
    [attemptId]
  );

  const answersResult = await pool.query(
    `
    SELECT
      question_id,
      id AS answer_id,
      is_correct
    FROM answers
    WHERE question_id = ANY(
      SELECT question_id
      FROM attempt_questions
      WHERE attempt_id = $1
    )
    `,
    [attemptId]
  );

  const userAnswersResult = await pool.query(
    `
    SELECT question_id, answer_id
    FROM attempt_answers
    WHERE attempt_id = $1
    `,
    [attemptId]
  );

  const correctAnswersByQuestion = new Map();
  const userAnswersByQuestion = new Map();

  for (const row of answersResult.rows) {
    if (!correctAnswersByQuestion.has(row.question_id)) {
      correctAnswersByQuestion.set(row.question_id, []);
    }

    if (row.is_correct) {
      correctAnswersByQuestion.get(row.question_id).push(row.answer_id);
    }
  }

  for (const row of userAnswersResult.rows) {
    if (!userAnswersByQuestion.has(row.question_id)) {
      userAnswersByQuestion.set(row.question_id, []);
    }

    userAnswersByQuestion.get(row.question_id).push(row.answer_id);
  }

  const corrections = questionsResult.rows.map((question) => {
    const correctAnswerIds = (correctAnswersByQuestion.get(question.id) || []).sort((a, b) => a - b);
    const userAnswerIds = (userAnswersByQuestion.get(question.id) || []).sort((a, b) => a - b);

    const ok =
      userAnswerIds.length === correctAnswerIds.length &&
      userAnswerIds.every((id, index) => id === correctAnswerIds[index]);

    return {
      questionId: question.id,
      ok,
      userAnswerIds,
      correctAnswerIds,
      explanation: question.explanation,
    };
  });

  const score = corrections.filter((item) => item.ok).length;

  await pool.query(
    `
    UPDATE attempts
    SET status = 'finished', finished_at = NOW()
    WHERE id = $1
    `,
    [attemptId]
  );

  return {
    attemptId,
    score,
    total: corrections.length,
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