const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authHelpers = require('../utils/auth.helpers');
const ErrorResponse = require('../utils/errorResponse');
const { USER_STATUS } = require('../utils/constants/statuses');

const mapPublicUser = authHelpers.mapUserRecord;
const INVALID_LOGIN_MESSAGE = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';

const login = async (email, password) => {
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            departmentRef: true,
            tier: true,
            courseStaff: { take: 1 },
            cohortSupervisors: { take: 1 },
            cohortRoleSupervisorRoles: { take: 1 },
            mentor: true,
            sheep: true
        }
    });

    if (!user) {
        throw new ErrorResponse(INVALID_LOGIN_MESSAGE, 401);
    }

    if (user.status !== USER_STATUS.ACTIVE) {
        throw new ErrorResponse(INVALID_LOGIN_MESSAGE, 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        throw new ErrorResponse(INVALID_LOGIN_MESSAGE, 401);
    }

    const token = jwt.sign(
        { userId: user.id, email: user.email, permission: user.permission, role: user.permission },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );

    return {
        token,
        user: mapPublicUser(user)
    };
};

const getCurrentUser = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            departmentRef: true,
            tier: true,
            courseStaff: { take: 1 },
            cohortSupervisors: { take: 1 },
            cohortRoleSupervisorRoles: { take: 1 },
            mentor: true,
            sheep: true
        }
    });

    if (!user) {
        throw new Error('User not found');
    }

    return mapPublicUser(user);
};

module.exports = {
    login,
    getCurrentUser
};
