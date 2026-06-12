const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const prismaPath = path.resolve(__dirname, '../src/utils/prisma.js');
const servicePath = path.resolve(__dirname, '../src/services/admin/courses/admin.lessons.js');

const loadLessonsService = (mockPrisma) => {
  [servicePath, prismaPath].forEach((cachePath) => {
    delete require.cache[cachePath];
  });

  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: mockPrisma
  };

  return require(servicePath);
};

test('updateLesson replaces quiz questions instead of appending duplicates', async () => {
  let updateInput;
  const service = loadLessonsService({
    lesson: {
      update: async (input) => {
        updateInput = input;
        return { id: input.where.id, ...input.data };
      }
    }
  });

  await service.updateLesson('lesson-1', {
    courseId: 'course-1',
    title: 'Quiz lesson',
    type: 'quiz',
    order: 1,
    points: 10,
    passScore: 80,
    questions: [
      {
        text: 'Question 1',
        points: 2,
        choices: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false }
        ]
      }
    ]
  });

  assert.deepEqual(updateInput.where, { id: 'lesson-1' });
  assert.deepEqual(updateInput.data.questions.deleteMany, {});
  assert.equal(updateInput.data.questions.create.length, 1);
  assert.equal(updateInput.data.questions.create[0].text, 'Question 1');
  assert.equal(updateInput.data.questions.create[0].choices.create.length, 2);
});

test('updateLesson clears existing quiz questions when saved with an empty question list', async () => {
  let updateInput;
  const service = loadLessonsService({
    lesson: {
      update: async (input) => {
        updateInput = input;
        return { id: input.where.id, ...input.data };
      }
    }
  });

  await service.updateLesson('lesson-1', {
    courseId: 'course-1',
    title: 'Quiz lesson',
    type: 'quiz',
    order: 1,
    points: 0,
    passScore: 60,
    questions: []
  });

  assert.deepEqual(updateInput.data.questions, { deleteMany: {} });
});
