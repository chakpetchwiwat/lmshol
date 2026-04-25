const prisma = require('../../utils/prisma');
const authHelpers = require('../../utils/auth.helpers');
const { USER_ROLES } = require('../../utils/constants/roles');
const { sanitizeName } = require('./admin.helpers');

const getActorContext = (authUser) => authHelpers.getActorContext(prisma, authUser);

const getDepartments = async (authUser) => {
    const actor = await getActorContext(authUser);

    return prisma.department.findMany({
        where: actor.role === USER_ROLES.MANAGER && actor.departmentId
            ? { id: actor.departmentId }
            : undefined,
        orderBy: { name: 'asc' }
    });
};

const createDepartment = async (data) => prisma.department.create({
    data: {
        name: sanitizeName(data.name, 'Department')
    }
});

const updateDepartment = async (id, data) => prisma.department.update({
    where: { id },
    data: {
        name: sanitizeName(data.name, 'Department')
    }
});

const deleteDepartment = async (id) => prisma.department.delete({
    where: { id }
});

module.exports = {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
};
