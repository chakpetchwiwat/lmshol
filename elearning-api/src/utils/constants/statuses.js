const ENTITY_STATUS = Object.freeze({
    PUBLISHED: 'PUBLISHED',
    DRAFT: 'DRAFT',
    ARCHIVED: 'ARCHIVED'
});

const USER_STATUS = Object.freeze({
    ACTIVE: 'ACTIVE'
});

const REWARD_STATUS = Object.freeze({
    ACTIVE: 'ACTIVE'
});

const ENROLLMENT_STATUS = Object.freeze({
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED'
});

const QUIZ_ATTEMPT_STATUS = Object.freeze({
    PASSED: 'PASSED',
    FAILED: 'FAILED'
});

const GOAL_STATUS = Object.freeze({
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED'
});

const REDEEM_STATUS = Object.freeze({
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    FULFILLED: 'FULFILLED'
});

module.exports = {
    ENTITY_STATUS,
    USER_STATUS,
    REWARD_STATUS,
    ENROLLMENT_STATUS,
    QUIZ_ATTEMPT_STATUS,
    GOAL_STATUS,
    REDEEM_STATUS
};
