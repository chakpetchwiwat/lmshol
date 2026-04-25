const getCourseRewardSummary = (course) => {
    const completionPoints = Number(course?.points) || 0;
    const quizPoints = Array.isArray(course?.lessons)
        ? course.lessons.reduce((sum, lesson) => {
            if (lesson?.type !== 'quiz') {
                return sum;
            }

            return sum + (Number(lesson?.points) || 0);
        }, 0)
        : 0;

    return {
        completionPoints,
        quizPoints,
        totalPoints: completionPoints + quizPoints
    };
};

module.exports = {
    getCourseRewardSummary
};
