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

const MODULE_CATEGORIES = [
    { type: 'STRAT_BUSINESS', name: 'ความเข้าใจธุรกิจและการค้า (Business Acumen)', icon: 'Briefcase' },
    { type: 'STRAT_BUSINESS', name: 'นวัตกรรมองค์กร (Corporate Innovation)', icon: 'Lightbulb' },
    { type: 'STRAT_CORE', name: 'การสื่อสารอย่างมีประสิทธิภาพ', icon: 'MessageSquare' },
    { type: 'STRAT_CORE', name: 'การทำงานเป็นทีม (Team Collaboration)', icon: 'Users' },
    { type: 'STRAT_FUNCTIONAL', name: 'ทักษะเฉพาะสายงานการตลาด', icon: 'Target' },
    { type: 'STRAT_FUNCTIONAL', name: 'ทักษะการขายและการเจรจาต่อรอง', icon: 'TrendingUp' },
    { type: 'STRAT_LEADERSHIP', name: 'การบริหารทีมและภาวะผู้นำ', icon: 'Crown' },
    { type: 'STRAT_COMPLIANCE', name: 'จรรยาบรรณและข้อบังคับองค์กร', icon: 'ShieldCheck' },
    { type: 'STRAT_DIGITAL', name: 'การวิเคราะห์ข้อมูลเบื้องต้น', icon: 'BarChart' },
    { type: 'STRAT_DIGITAL', name: 'เทคโนโลยีปัญญาประดิษฐ์ (AI Technologies)', icon: 'Cpu' }
];

const COURSE_TITLES: Record<string, string[]> = {
    'STRAT_BUSINESS': ['วิเคราะห์งบการเงินเบื้องต้นสำหรับผู้บริหาร', 'กลยุทธ์การตัดสินใจทางธุรกิจยุคใหม่', 'ภาพรวมเศรษฐกิจอุตสาหกรรม 2026'],
    'STRAT_CORE': ['ทักษะการนำเสนออย่างมืออาชีพ', 'การบริหารจัดการเวลา (Time Management)', 'การแก้ปัญหาเชิงตรรกะแบบ Design Thinking'],
    'STRAT_FUNCTIONAL': ['กลยุทธ์การตลาดดิจิทัลขั้นสูง', 'ทักษะการปิดการขายแบบ B2B', 'การวิเคราะห์พฤติกรรมลูกค้าเชิงลึก'],
    'STRAT_LEADERSHIP': ['การให้ Feedback อย่างสร้างสรรค์', 'ศิลปะการเป็นผู้นำยุคใหม่', 'การบริหารความขัดแย้งในทีม'],
    'STRAT_COMPLIANCE': ['PDPA สำหรับพนักงาน 101', 'นโยบายความปลอดภัยไซเบอร์ (Cybersecurity)', 'มาตรฐานจริยธรรมวิชาชีพในสถานที่ทำงาน'],
    'STRAT_DIGITAL': ['การใช้ AI ช่วยเพิ่มประสิทธิภาพการทำงาน', 'พื้นฐาน Data Science สำหรับธุรกิจ', 'เครื่องมือ Automation ในองค์กร']
};

const DEPARTMENTS = [
    'Management', 'IT', 'Human Resources', 'Accounting', 'Sales', 'Marketing', 'Operations', 'Finance'
];

async function main() {
    console.log('--- Start Robust Demo Seeding ---');

    console.log('Cleaning up old data to prevent duplication issues...');
    // We optionally clean up some data to start fresh, but let's rely on upsert for structure and delete attempts/enrollments to clear old data
    await prisma.quizAttempt.deleteMany({});
    await prisma.userCourse.deleteMany({});
    await prisma.lesson.deleteMany({}); // Optional, cleans up old lessons
    await prisma.course.deleteMany({}); // Cleans up old courses

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

    // 2. Ensure Categories exist
    console.log('Setting up categories and modules...');
    const catRefs: any[] = [];
    for (const [index, m] of MODULE_CATEGORIES.entries()) {
        const res = await prisma.category.upsert({
            where: { name: m.name },
            update: { type: m.type, icon: m.icon, order: index },
            create: { 
                name: m.name, 
                type: m.type, 
                icon: m.icon,
                order: index
            }
        });
        catRefs.push(res);
    }

    // 3. Create Courses (Realistic titles, all with quizzes)
    console.log('Creating courses...');
    const courseRefs: any[] = [];
    const quizLessonMap: Record<string, string> = {};

    let courseIndex = 1;
    for (const cat of catRefs) {
        const titles = COURSE_TITLES[cat.type] || [`หลักสูตรมาตรฐานสำหรับ ${cat.name}`];
        for (let i = 0; i < titles.length; i++) {
            const courseTitle = titles[i];
            const courseId = `demo-course-${Date.now()}-${courseIndex++}`;
            const course = await prisma.course.create({
                data: {
                    id: courseId,
                    title: courseTitle,
                    description: `คอร์สเรียน "${courseTitle}" ที่ออกแบบมาเพื่ออัปสกิลพนักงานในส่วนของ ${cat.name} ให้สอดคล้องกับเป้าหมายองค์กร`,
                    categoryId: cat.id,
                    status: 'PUBLISHED',
                    points: (i + 1) * 100,
                    instructorName: 'ทีมวิทยากร ScaleUp',
                    totalDuration: `${(i + 1) * 45} นาที`
                }
            });
            courseRefs.push(course);

            // Add a video lesson
            await prisma.lesson.create({
                data: {
                    courseId: course.id,
                    title: `เนื้อหาบทเรียน: ${courseTitle}`,
                    type: 'video',
                    content: 'เนื้อหาและวิดีโอประกอบการเรียนรู้',
                    order: 1
                }
            });

            // Add a quiz lesson
            const quizLesson = await prisma.lesson.create({
                data: {
                    courseId: course.id,
                    title: `แบบทดสอบท้ายบท: ${courseTitle}`,
                    type: 'quiz',
                    content: 'ทำแบบทดสอบเพื่อวัดความเข้าใจจากเนื้อหาที่ได้เรียนไป',
                    order: 2,
                    passScore: 70,
                    questions: {
                        create: [
                            {
                                text: `จากเรื่อง ${courseTitle} ข้อใดคือหลักการที่สำคัญที่สุด?`,
                                choices: {
                                    create: [
                                        { text: 'ตัวเลือกที่ 1 (ข้อที่ถูกต้อง)', isCorrect: true },
                                        { text: 'ตัวเลือกที่ 2', isCorrect: false },
                                        { text: 'ตัวเลือกที่ 3', isCorrect: false }
                                    ]
                                }
                            }
                        ]
                    }
                }
            });
            quizLessonMap[course.id] = quizLesson.id;
        }
    }

    // 4. Create 93 more Users (Total 100) or just ensure 100 exist
    console.log('Generating demo users...');
    const password = await bcrypt.hash('password123', 10);
    const users: any[] = [];
    
    // We won't delete users to avoid breaking other logic, but we'll create up to 100 users.
    const existingUsers = await prisma.user.count({ where: { permission: 'user' }});
    const usersToCreate = Math.max(0, 100 - existingUsers);
    
    for (let i = 0; i < usersToCreate; i++) {
        const firstName = THAI_FIRST_NAMES[Math.floor(Math.random() * THAI_FIRST_NAMES.length)];
        const lastName = THAI_LAST_NAMES[Math.floor(Math.random() * THAI_LAST_NAMES.length)];
        const dept = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
        const email = `user-v2-${Date.now()}-${i}@scaleup-demo.co.th`;
        
        await prisma.user.create({
            data: {
                name: `${firstName} ${lastName}`,
                email,
                password: password,
                permission: 'user',
                departmentId: deptRefs[dept],
                department: dept,
                employmentDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
            }
        });
    }

    const allUsers = await prisma.user.findMany({ where: { permission: 'user' } });

    // 5. Create Enrollments and QuizAttempts
    console.log('Assigning varied learning progress and quiz scores...');
    for (const user of allUsers) {
        // Each user gets 4-7 random enrollments
        const count = 4 + Math.floor(Math.random() * 4);
        const shuffledCourses = courseRefs.sort(() => 0.5 - Math.random());
        const selectedCourses = shuffledCourses.slice(0, count);

        for (const course of selectedCourses) {
            let status = 'IN_PROGRESS';
            let progress = Math.floor(Math.random() * 100);
            let deadline: Date | null = new Date(Date.now() + (Math.random() * 30 - 5) * 24 * 60 * 60 * 1000); 
            let completedAt: Date | null = null;
            let score = 0;
            let quizStatus = 'FAILED';

            // Distribution
            const rand = Math.random();
            if (rand < 0.35) { // 35% Completed
                status = 'COMPLETED';
                progress = 100;
                completedAt = new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000);
                score = 70 + Math.floor(Math.random() * 31); // 70-100
                quizStatus = 'PASSED';
            } else if (rand < 0.60) { // 25% Not Started
                status = 'NOT_STARTED';
                progress = 0;
            } else {
                // 40% In progress
                if (Math.random() > 0.5) { // Half of 'in progress' tried the quiz but failed
                    score = 20 + Math.floor(Math.random() * 40); // 20-59
                }
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

            // Create Quiz Attempt if score > 0 or status is completed
            if (status === 'COMPLETED' || score > 0) {
                await prisma.quizAttempt.create({
                    data: {
                        userId: user.id,
                        lessonId: quizLessonMap[course.id],
                        score,
                        status: quizStatus,
                        createdAt: completedAt || new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000)
                    }
                });
            }
        }
    }

    // 6. Create Learning Goals for all Departments
    console.log('Creating demo learning goals for all departments...');
    const goalExpiryBase = new Date();
    
    // Global Goals
    await prisma.learningGoal.create({
        data: {
            title: 'Q2 Core Competency (Global)',
            type: 'ANY',
            targetCount: 3,
            expiryDate: new Date(goalExpiryBase.getTime() + 5 * 24 * 60 * 60 * 1000), // Expires in 5 days
            scope: 'GLOBAL',
            status: 'ACTIVE'
        }
    });

    // Department Specific Goals
    for (const d of DEPARTMENTS) {
        const deptId = deptRefs[d];
        await prisma.learningGoal.create({
            data: {
                title: `${d} Professional Development`,
                type: 'ANY',
                targetCount: 2,
                expiryDate: new Date(goalExpiryBase.getTime() + (Math.random() * 15 + 2) * 24 * 60 * 60 * 1000), 
                scope: 'DEPARTMENT',
                departmentId: deptId,
                status: 'ACTIVE'
            }
        });
    }

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
