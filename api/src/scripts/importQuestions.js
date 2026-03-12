import pool from "../config/database.js";
import { questions } from "../mocks/questions.mock.js";

async function importQuestions() {
  try {
    for (const question of questions) {

      await pool.query(
        `INSERT INTO questions (id, category_id, question_normal, question_falc, explanation)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          question.id,
          question.categoryId,
          question.questionNormal,
          question.questionFalc,
          question.explanation
        ]
      );

      for (const answer of question.answers) {
        await pool.query(
          `INSERT INTO answers (id, question_id, text, is_correct)
           VALUES ($1, $2, $3, $4)`,
          [
            answer.id,
            question.id,
            answer.text,
            answer.isCorrect
          ]
        );
      }
    }

    console.log("Import des questions terminé");
    process.exit();
  } catch (error) {
    console.error("Erreur import :", error);
    process.exit(1);
  }
}

importQuestions();