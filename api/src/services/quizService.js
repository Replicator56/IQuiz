import prisma from "../lib/prisma.js";


// lit les catégories, ne retourne que id et name et trie par ordre alphabétique
export async function fetchCategories() {
    return prisma.category.findMany({
        select: {
            id: true,
            name: true,
        },
        orderBy: {
            name: "asc",
        },
    });
}


// valide les paramètres, applique la règle métier, filtre les questions, vérifie qu'il y a assez de questions
// charge les questions et réponses, choisit le texte à afficher, mélange les questions et réponses
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

    const nbQuestions = gameMode === "practice" ? 10 : 40;

    const whereClause =
        gameMode === "practice"
            ? { categoryId: Number(categoryId) }
            : {};

    const totalAvailableQuestions = await prisma.question.count({
        where: whereClause,
    });

    if (totalAvailableQuestions < nbQuestions) {
        throw new Error("NOT_ENOUGH_QUESTIONS");
    }

    const questions = await prisma.question.findMany({
        where: whereClause,
        include: {
            answers: {
                select: {
                    id: true,
                    text: true,
                },
            },
        },
    });

    const shuffledQuestions = shuffleArray(questions).slice(0, nbQuestions);

    return {
        total: nbQuestions,
        questions: shuffledQuestions.map((question) => ({
            id: question.id,
            text:
                readingMode === "falc"
                    ? question.questionFalc
                    : question.questionNormal,
            answers: shuffleArray(question.answers),
        })),
    };
}

export async function checkAnswer({ questionId, answerIds }) {
    if (!questionId || !Array.isArray(answerIds)) {
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

    const question = await prisma.question.findUnique({
        where: { id: normalizedQuestionId },
        select: {
            id: true,
            explanation: true,
            answers: {
                select: {
                    id: true,
                    isCorrect: true,
                },
            },
        },
    });

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

    return {
        ok,
        correctAnswerIds,
        explanation: question.explanation,
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