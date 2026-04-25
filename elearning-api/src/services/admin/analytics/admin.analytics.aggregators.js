const { getTimeBucketKey } = require('./admin.analytics.engine');

/**
 * Aggregates learner performance into weekly/monthly activity buckets.
 */
const aggregateActivity = (performance, bucketTemplate, mode) => {
    const activityMap = Object.fromEntries(bucketTemplate.map((bucket) => [bucket.key, bucket]));

    performance.forEach((item) => {
        const key = getTimeBucketKey(item.startedAt, mode);
        if (!activityMap[key]) return;
        
        activityMap[key].count += 1;
        activityMap[key].details.push({
            userId: item.userId,
            userName: item.userName,
            department: item.department,
            courseTitle: item.courseTitle,
            startedAt: item.startedAt,
            status: item.status,
            score: item.score
        });
    });

    return bucketTemplate.map((bucket) => ({
        date: bucket.label,
        label: bucket.fullLabel,
        bucketKey: bucket.key,
        count: activityMap[bucket.key]?.count || 0,
        details: activityMap[bucket.key]?.details || []
    }));
};

/**
 * Aggregates distribution of courses/enrollments by Type and Category.
 */
const aggregateDistributions = (performance, categories, types, typeLabels) => {
    const typeMap = Object.fromEntries(types.map((type) => [type, {
        type,
        name: typeLabels[type],
        value: 0,
        enrollmentCount: 0,
        courses: [],
        details: []
    }]));

    const categoryMap = {};
    const popularCourseMap = {};

    performance.forEach((item) => {
        // Type Distribution
        const typeGroup = typeMap[item.categoryType] || typeMap[types[0]];
        typeGroup.enrollmentCount += 1;
        typeGroup.details.push({
            userId: item.userId,
            userName: item.userName,
            department: item.department,
            courseTitle: item.courseTitle,
            status: item.status,
            score: item.score,
            completedAt: item.completedAt,
            startedAt: item.startedAt
        });

        if (!typeGroup.courses.some((course) => course.id === item.courseId)) {
            typeGroup.courses.push({
                id: item.courseId,
                title: item.courseTitle,
                students: 0
            });
        }
        const typeCourse = typeGroup.courses.find((course) => course.id === item.courseId);
        typeCourse.students += 1;

        // Category Distribution
        if (!categoryMap[item.categoryName]) {
            categoryMap[item.categoryName] = {
                name: item.categoryName,
                value: 0,
                details: []
            };
        }
        categoryMap[item.categoryName].value += 1;
        categoryMap[item.categoryName].details.push({
            userId: item.userId,
            userName: item.userName,
            department: item.department,
            courseTitle: item.courseTitle,
            status: item.status,
            score: item.score
        });

        // Popular Courses
        if (!popularCourseMap[item.courseId]) {
            popularCourseMap[item.courseId] = {
                id: item.courseId,
                title: item.courseTitle,
                students: 0,
                details: []
            };
        }
        popularCourseMap[item.courseId].students += 1;
        popularCourseMap[item.courseId].details.push({
            userId: item.userId,
            userName: item.userName,
            department: item.department,
            status: item.status,
            score: item.score,
            completedAt: item.completedAt,
            startedAt: item.startedAt
        });
    });

    // Add category count to types
    categories.forEach((category) => {
        const typeGroup = typeMap[category.type] || typeMap[types[0]];
        typeGroup.value += 1;
    });

    const typeDistribution = Object.values(typeMap)
        .filter((group) => group.value > 0 || group.enrollmentCount > 0)
        .map((group) => ({
            ...group,
            courses: group.courses.sort((left, right) => right.students - left.students)
        }));

    const categoryDistribution = Object.values(categoryMap)
        .sort((left, right) => right.value - left.value);

    const popularCourses = Object.values(popularCourseMap)
        .sort((left, right) => right.students - left.students)
        .slice(0, 8);

    return {
        typeDistribution,
        categoryDistribution,
        popularCourses
    };
};

/**
 * Aggregates ROI Trend (Points and Completions) into time buckets.
 */
const aggregateRoiTrend = (enrollments, points, bucketTemplate, mode) => {
    const roiMap = Object.fromEntries(bucketTemplate.map((bucket) => [bucket.key, {
        ...bucket,
        completions: 0,
        points: 0,
        details: []
    }]));

    enrollments.forEach((enrollment) => {
        if (enrollment.status !== 'COMPLETED' || !enrollment.completedAt) return;
        const key = getTimeBucketKey(enrollment.completedAt, mode);
        const bucket = roiMap[key];
        if (!bucket) return;

        bucket.completions += 1;
        bucket.details.push({
            kind: 'completion',
            userId: enrollment.userId,
            userName: enrollment.userName,
            department: enrollment.department,
            courseTitle: enrollment.courseTitle,
            completedAt: enrollment.completedAt,
            points: 0
        });
    });

    points.forEach((entry) => {
        const key = getTimeBucketKey(entry.createdAt, mode);
        const bucket = roiMap[key];
        if (!bucket) return;

        bucket.points += entry.points;
        bucket.details.push({
            kind: 'points',
            userId: entry.userId,
            userName: entry.userName,
            department: entry.department,
            courseTitle: entry.note || 'Learning reward',
            completedAt: entry.createdAt,
            points: entry.points
        });
    });

    return bucketTemplate.map(bucket => ({
        month: bucket.label,
        label: bucket.fullLabel,
        bucketKey: bucket.key,
        points: roiMap[bucket.key]?.points || 0,
        completions: roiMap[bucket.key]?.completions || 0,
        details: roiMap[bucket.key]?.details || []
    }));
};

module.exports = {
    aggregateActivity,
    aggregateDistributions,
    aggregateRoiTrend
};
