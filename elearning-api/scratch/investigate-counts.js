const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      role: true,
      status: true
    }
  });

  console.log('--- User Counts ---');
  console.log('Total users in DB:', allUsers.length);
  
  const roleCounts = allUsers.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});
  console.log('Counts by Role:', roleCounts);

  const statusCounts = allUsers.reduce((acc, u) => {
    acc[u.status] = (acc[u.status] || 0) + 1;
    return acc;
  }, {});
  console.log('Counts by Status:', statusCounts);

  const userRoleActive = allUsers.filter(u => u.role === 'USER' && u.status === 'ACTIVE').length;
  console.log('Users (Role=USER, Status=ACTIVE):', userRoleActive);

  const userRoleAnyStatus = allUsers.filter(u => u.role === 'USER').length;
  console.log('Users (Role=USER, Any Status):', userRoleAnyStatus);

  const anyRoleActive = allUsers.filter(u => u.status === 'ACTIVE').length;
  console.log('Any Role (Status=ACTIVE):', anyRoleActive);

  // Check specific Goal
  const goal = await prisma.learningGoal.findFirst({
    where: { title: { contains: 'Test notification' } }
  });

  if (goal) {
    console.log('\n--- Goal: Test notification ---');
    console.log('Goal ID:', goal.id);
    console.log('Goal Scope:', goal.scope);
    console.log('Goal Department ID:', goal.departmentId);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
