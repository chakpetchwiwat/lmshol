const prisma = require('../../utils/prisma');
const authHelpers = require('../../utils/auth.helpers');
const { buildPointsHistory } = require('../admin/users/admin.users.details');

const mapPublicUser = authHelpers.mapUserRecord;

/**
 * Gets all active sheep (mentees) assigned to the logged-in mentor.
 * Returns basic profile summary, baptism milestones, and latest active course progress.
 */
const getMySheep = async (userId) => {
    const sheepList = await prisma.user.findMany({
        where: {
            mentorId: userId,
            status: 'ACTIVE'
        },
        include: {
            departmentRef: true,
            tier: true,
            enrollments: {
                include: {
                    course: {
                        select: { id: true, title: true }
                    }
                },
                orderBy: [
                    { completedAt: 'desc' },
                    { startedAt: 'desc' }
                ]
            }
        },
        orderBy: { name: 'asc' }
    });

    return sheepList.map(u => {
        const latestEnrollment = u.enrollments[0] || null;
        return {
            id: u.id,
            name: u.name,
            nickname: u.nickname || '-',
            email: u.email,
            department: u.departmentRef?.name || u.department || '-',
            tier: u.tier?.name || '-',
            waterBaptismDate: u.waterBaptismDate,
            spiritBaptismDate: u.spiritBaptismDate,
            latestCourse: latestEnrollment?.course?.title || '-',
            progress: latestEnrollment?.progressPercent || 0,
            status: latestEnrollment?.status || 'NOT_STARTED'
        };
    });
};

/**
 * Gets the detailed progress of a specific sheep under the logged-in mentor's care.
 */
const getSheepDetails = async (userId, sheepId) => {
    // 1. Verify relationship and get basic user details
    const sheep = await prisma.user.findFirst({
        where: {
            id: sheepId,
            mentorId: userId,
            status: 'ACTIVE'
        },
        include: {
            departmentRef: true,
            tier: true,
            certificates: {
                include: {
                    competencies: {
                        include: {
                            competency: {
                                select: { code: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            },
            issuedCertificates: {
                where: { status: 'VALID' },
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true,
                            competencies: {
                                include: {
                                    competency: {
                                        select: { code: true }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: { issuedAt: 'desc' }
            },
            enrollments: {
                include: { course: { include: { category: true } } },
                orderBy: { startedAt: 'desc' }
            }
        }
    });

    if (!sheep) {
        throw new Error('Sheep not found or you are not assigned as mentor for this user.');
    }

    // Reuse helper from admin.users.details to format points history
    const pointsHistory = await buildPointsHistory(sheep.id);
    const actualPointsBalance = pointsHistory.reduce((sum, entry) => sum + entry.points, 0);

    return {
        ...mapPublicUser(sheep),
        pointsBalance: actualPointsBalance,
        enrollments: sheep.enrollments.map((enrollment) => ({
            id: enrollment.id,
            status: enrollment.status,
            progressPercent: enrollment.progressPercent,
            startedAt: enrollment.startedAt,
            completedAt: enrollment.completedAt,
            course: {
                id: enrollment.course.id,
                title: enrollment.course.title,
                categoryName: enrollment.course.category?.name || null,
                points: enrollment.course.points
            }
        })),
        externalCertificates: (sheep.certificates || []).map(cert => ({
            ...cert,
            competencyCode: cert.competencies
                ? cert.competencies.map(cc => cc.competency?.code).filter(Boolean).join(', ')
                : ''
        })),
        systemCertificates: (sheep.issuedCertificates || []).map(cert => {
            const competencyCodes = cert.course?.competencies
                ? cert.course.competencies.map(cc => cc.competency?.code).filter(Boolean)
                : [];
            return {
                id: cert.id,
                certificateNo: cert.certificateNo,
                courseTitle: cert.course?.title,
                courseId: cert.courseId,
                issuedAt: cert.issuedAt,
                pdfUrl: cert.pdfUrl,
                competencyCode: competencyCodes.join(', ') || ''
            };
        }),
        pointsHistory
    };
};

module.exports = {
    getMySheep,
    getSheepDetails
};
