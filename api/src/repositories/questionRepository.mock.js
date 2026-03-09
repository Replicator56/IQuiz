import { categories } from "../mocks/categories.mock.js";
import { questions } from "../mocks/questions.mock.js";

export function findAllCategories() {
  return categories;
}

export function findAllQuestions() {
  return questions;
}

export function findQuestionsByCategory(categoryId) {
  return questions.filter((question) => question.categoryId === Number(categoryId));
}

export function findQuestionById(questionId) {
  return questions.find((question) => question.id === Number(questionId));
}