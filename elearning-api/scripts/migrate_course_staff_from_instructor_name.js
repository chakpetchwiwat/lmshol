const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const normalizeName = (value) => value?.trim() || null;

async function migrate() {
  const courses = await prisma.course.findMany({
    where: {
      instructorName: {
        not: null
      }
    },
    select: {
      id: true,
      title: true,
      instructorName: true,
      staff: {
        where: {
          role: 'instructor',
          isPrimary: true
        },
        select: {
          id: true
        },
        take: 1
      }
    }
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const course of courses) {
    const instructorName = normalizeName(course.instructorName);

    if (!instructorName || course.staff.length > 0) {
      skipped += 1;
      continue;
    }

    const user = await prisma.user.findFirst({
      where: {
        name: instructorName
      },
      select: {
        id: true
      }
    });

    if (!user) {
      skipped += 1;
      console.warn(`Skipped course "${course.title}" (${course.id}): no user named "${instructorName}"`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.courseStaff.updateMany({
        where: {
          courseId: course.id,
          role: 'instructor',
          isPrimary: true
        },
        data: {
          isPrimary: false
        }
      });

      const existing = await tx.courseStaff.findUnique({
        where: {
          courseId_userId_role: {
            courseId: course.id,
            userId: user.id,
            role: 'instructor'
          }
        },
        select: {
          id: true
        }
      });

      if (existing) {
        await tx.courseStaff.update({
          where: {
            id: existing.id
          },
          data: {
            isPrimary: true
          }
        });
        updated += 1;
        return;
      }

      await tx.courseStaff.create({
        data: {
          courseId: course.id,
          userId: user.id,
          role: 'instructor',
          isPrimary: true
        }
      });
      created += 1;
    });
  }

  console.log('CourseStaff instructor migration completed:', {
    courses: courses.length,
    created,
    updated,
    skipped
  });
}

migrate()
  .catch((error) => {
    console.error('CourseStaff instructor migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
