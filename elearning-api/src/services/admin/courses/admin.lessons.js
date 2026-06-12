const prisma = require('../../../utils/prisma');
const { parseInteger } = require('../admin.helpers');

const getCourseLessons = async (courseId) => prisma.lesson.findMany({
    where: { courseId },
    include: {
        questions: {
            include: { choices: true },
            orderBy: { order: 'asc' }
        }
    },
    orderBy: { order: 'asc' }
});

const createLesson = async (data) => {
    const { questions, ...lessonData } = data;
    const formattedData = {
        ...lessonData,
        order: parseInteger(lessonData.order, 0),
        points: parseInteger(lessonData.points, 0),
        passScore: parseInteger(lessonData.passScore, 0),
        duration: lessonData.duration ? String(lessonData.duration) : undefined
    };

    if (lessonData.type === 'quiz' && questions && questions.length > 0) {
        formattedData.questions = {
            create: questions.map((question, index) => ({
                text: question.text,
                order: index,
                points: parseInteger(question.points, 1),
                choices: {
                    create: question.choices.map((choice) => ({
                        text: choice.text,
                        isCorrect: !!choice.isCorrect
                    }))
                }
            }))
        };
    }

    return prisma.lesson.create({
        data: formattedData,
        include: {
            questions: {
                include: { choices: true }
            }
        }
    });
};

const updateLesson = async (id, data) => {
    const { questions, ...lessonData } = data;

    const formattedData = {
        ...lessonData,
        order: parseInteger(lessonData.order, 0),
        points: parseInteger(lessonData.points, 0),
        passScore: parseInteger(lessonData.passScore, 0),
        duration: lessonData.duration ? String(lessonData.duration) : undefined
    };

    if (lessonData.type !== 'quiz') {
        formattedData.questions = {
            deleteMany: {}
        };
    } else if (Array.isArray(questions)) {
        formattedData.questions = {
            deleteMany: {},
            ...(questions.length > 0
                ? {
                    create: questions.map((question, index) => ({
                        text: question.text,
                        order: index,
                        points: parseInteger(question.points, 1),
                        choices: {
                            create: question.choices.map((choice) => ({
                                text: choice.text,
                                isCorrect: !!choice.isCorrect
                            }))
                        }
                    }))
                }
                : {})
        };
    }

    return prisma.lesson.update({
        where: { id },
        data: formattedData,
        include: {
            questions: {
                include: { choices: true }
            }
        }
    });
};

const deleteLesson = async (id) => prisma.lesson.delete({ where: { id } });

const reorderLessons = async (lessonIds) => prisma.$transaction(
    lessonIds.map((id, index) => prisma.lesson.update({
        where: { id },
        data: { order: index }
    }))
);

module.exports = {
    getCourseLessons,
    createLesson,
    updateLesson,
    deleteLesson,
    reorderLessons
};
