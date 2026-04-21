import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const THAI_FIRST_NAMES = [
    'ประเสริฐ', 'วิชัย', 'สมชาย', 'ธงชัย', 'มานะ', 'อภิชาติ', 'เกียรติศักดิ์', 'นที', 'อานนท์', 'พีระ',
    'สุรพล', 'สมเกียรติ', 'เจษฎา', 'กวี', 'ธนพล', 'ปกรณ์', 'รัตนะ', 'วิโรจน์', 'สิทธิชัย', 'อาวุธ',
    'วรรณพร', 'ศิริพร', 'นงลักษณ์', 'วิไลวรรณ', 'อารีย์', 'ดวงพร', 'สมบูรณ์', 'พัชรี', 'สุนันทา', 'สุภาพร',
    'รัชนี', 'กัญญารัตน์', 'จงลักษณ์', 'จินตนา', 'ยุพา', 'ศิริวรรณ', 'อมรรัตน์', 'อุษา', 'กนกวรรณ', 'ดวงใจ'
];

const THAI_LAST_NAMES = [
    'รักไทย', 'เจริญผล', 'แก้ววิจิตร', 'สมบูรณ์ทรัพย์', 'รุ่งเรือง', 'ใจดี', 'วิเศษศิลป์', 'ศิริรุ่งโรจน์', 'เพชรน้ำหนึ่ง', 'พงษ์เพชร',
    'ถิรวัฒน์', 'วงศ์สุวรรณ', 'มณีโชติ', 'รัตนโกสินทร์', 'บุญส่ง', 'ประเสริฐยิ่ง', 'ธรรมคุณ', 'ปัญญาสกุล', 'สิริวัฒนา', 'เกียรติขจร'
];

const MODULE_TYPES = [
    { type: 'STRAT_BUSINESS', name: 'Business Acumen / Corporate Knowledge', icon: 'Cpu' },
    { type: 'STRAT_CORE', name: 'Core / Soft Skills', icon: 'User' },
    { type: 'STRAT_FUNCTIONAL', name: 'Functional Skills', icon: 'Settings' },
    { type: 'STRAT_LEADERSHIP', name: 'Leadership Skills', icon: 'Zap' },
    { type: 'STRAT_COMPLIANCE', name: 'Compliance', icon: 'Shield' },
    { type: 'STRAT_DIGITAL', name: 'Digital / Future Skills', icon: 'Code' }
];

const DEPARTMENTS = [
    'Management', 'IT', 'Human Resources', 'Accounting', 'Sales', 'Marketing', 'Operations', 'Finance'
];

async function main() {
    console.log('--- Start Robust Demo Seeding ---');

    // 1. Ensure Departments exist
    console.log('Setting up departments...');
    const deptRefs: any = {};
    for (const d of DEPARTMENTS) {
        const res = await prisma.department.upsert({
            where: { name: d },
            update: {},
            create: { name: d }
        });
        deptRefs[d] = res.id;
    }

    // 2. Ensure Modules (Categories) exist
    console.log('Setting up categories and modules...');
    const catRefs: any[] = [];
    for (const m of MODULE_TYPES) {
        const res = await prisma.category.upsert({
            where: { name: m.name },
            update: { type: m.type },
            create: { 
                name: m.name, 
                type: m.type, 
                icon: m.icon 
            }
        });
        catRefs.push(res);
    }

    // 3. Create Courses (4 per module, some with no quiz)
    console.log('Creating courses...');
    const courseRefs: any[] = [];
    for (const cat of catRefs) {
        for (let i = 1; i <= 4; i++) {
            const hasQuiz = !(cat.type === 'STRAT_FUNCTIONAL' && i % 2 === 0); // Functional 2 & 4 have NO QUIZ
            const course = await prisma.course.upsert({
                where: { id: `demo-course-${cat.type}-${i}` },
                update: {},
                create: {
                    id: `demo-course-${cat.type}-${i}`,
                    title: `${cat.name} Level ${i}`,
                    description: `This is a demo course for ${cat.name} module, focusing on phase ${i}.`,
                    categoryId: cat.id,
                    status: 'PUBLISHED',
                    points: i * 10,
                    instructorName: 'Demo Expert',
                    totalDuration: `${i * 30} mins`
                }
            });
            courseRefs.push(course);

            if (hasQuiz) {
                // Add a lesson with quiz questions
                const lesson = await prisma.lesson.create({
                    data: {
                        courseId: course.id,
                        title: 'Final Assessment',
                        type: 'video',
                        content: 'Check your knowledge in this quiz.',
                        order: 1,
                        passScore: 70,
                        questions: {
                            create: [
                                {
                                    text: 'Common sense check: is this a demo course?',
                                    choices: {
                                        create: [
                                            { text: 'Yes', isCorrect: true },
                                            { text: 'No', isCorrect: false }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                });
            } else {
                // Add a lesson with NO quiz questions
                await prisma.lesson.create({
                    data: {
                        courseId: course.id,
                        title: 'Learning Resource (No Quiz)',
                        type: 'video',
                        content: 'Please watch this video to complete the course.',
                        order: 1
                    }
                });
            }
        }
    }

    // 4. Create 93 more Users (Total 100)
    console.log('Generating 93 demo users...');
    const password = await bcrypt.hash('password123', 10);
    const users: any[] = [];
    for (let i = 0; i < 93; i++) {
        const firstName = THAI_FIRST_NAMES[Math.floor(Math.random() * THAI_FIRST_NAMES.length)];
        const lastName = THAI_LAST_NAMES[Math.floor(Math.random() * THAI_LAST_NAMES.length)];
        const dept = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
        
        const user = await prisma.user.create({
            data: {
                name: `${firstName} ${lastName}`,
                email: `user${i + 8}@scaleup-demo.co.th`,
                password: password,
                role: 'user',
                departmentId: deptRefs[dept],
                department: dept,
                employmentDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
            }
        });
        users.push(user);
    }

    // 5. Create Enrollments with varied status
    console.log('Assigning varied learning progress...');
    const now = new Date();
    for (const user of users) {
        // Each user gets 3-5 random enrollments
        const count = 3 + Math.floor(Math.random() * 3);
        const shuffledCourses = courseRefs.sort(() => 0.5 - Math.random());
        const selectedCourses = shuffledCourses.slice(0, count);

        for (const course of selectedCourses) {
            let status = 'IN_PROGRESS';
            let progress = Math.floor(Math.random() * 100);
            let deadline: Date | null = new Date(Date.now() + (Math.random() * 30 - 5) * 24 * 60 * 60 * 1000); // Some in past (-5 days)
            let completedAt: Date | null = null;

            // Distribution
            const rand = Math.random();
            if (rand < 0.25) {
                status = 'COMPLETED';
                progress = 100;
                completedAt = new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000);
            } else if (rand < 0.45) {
                status = 'NOT_STARTED';
                progress = 0;
            }

            await prisma.userCourse.create({
                data: {
                    userId: user.id,
                    courseId: course.id,
                    status,
                    progressPercent: progress,
                    deadline,
                    completedAt
                }
            });
        }
    }

    // 6. Create some Learning Goals
    console.log('Creating demo learning goals...');
    await prisma.learningGoal.create({
        data: {
            title: 'Q2 Global Competency Mission',
            type: 'ANY',
            targetCount: 2,
            expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
            scope: 'GLOBAL',
            status: 'ACTIVE'
        }
    });

    console.log('--- Robust Demo Seeding COMPLETED ---');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
