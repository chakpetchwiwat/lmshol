const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OLD_URL_PREFIX = 'https://axhzesrtlybenudgmtlm.supabase.co/storage/v1/object/public/';

async function updateUrls() {
    console.log('🔄 Starting DB URL replacement...');

    // 1. Update User.profileImageUrl
    const users = await prisma.user.findMany({ where: { profileImageUrl: { startsWith: OLD_URL_PREFIX } } });
    for (const user of users) {
        const newUrl = user.profileImageUrl.replace(`${OLD_URL_PREFIX}uploads/`, '/uploads/public/');
        await prisma.user.update({ where: { id: user.id }, data: { profileImageUrl: newUrl } });
    }
    console.log(`✅ Updated ${users.length} User profile images.`);

    // 2. Update Course.image
    const courses = await prisma.course.findMany({ where: { image: { startsWith: OLD_URL_PREFIX } } });
    for (const course of courses) {
        const newUrl = course.image.replace(`${OLD_URL_PREFIX}uploads/`, '/uploads/public/');
        await prisma.course.update({ where: { id: course.id }, data: { image: newUrl } });
    }
    console.log(`✅ Updated ${courses.length} Course images.`);

    // 3. Update Announcement.image
    const announcements = await prisma.announcement.findMany({ where: { image: { startsWith: OLD_URL_PREFIX } } });
    for (const ann of announcements) {
        const newUrl = ann.image.replace(`${OLD_URL_PREFIX}uploads/`, '/uploads/public/');
        await prisma.announcement.update({ where: { id: ann.id }, data: { image: newUrl } });
    }
    console.log(`✅ Updated ${announcements.length} Announcement images.`);

    // 4. Update Reward.image
    const rewards = await prisma.reward.findMany({ where: { image: { startsWith: OLD_URL_PREFIX } } });
    for (const reward of rewards) {
        const newUrl = reward.image.replace(`${OLD_URL_PREFIX}uploads/`, '/uploads/public/');
        await prisma.reward.update({ where: { id: reward.id }, data: { image: newUrl } });
    }
    console.log(`✅ Updated ${rewards.length} Reward images.`);

    // Note: fileKey columns don't need URL replacement because they are just paths.
    // However, if any fileKey has the full URL, we should fix it, but usually they don't.
    // Let's also check UserCertificate fileUrl
    const certs = await prisma.userCertificate.findMany({ where: { fileUrl: { startsWith: OLD_URL_PREFIX } } });
    for (const cert of certs) {
        const newUrl = cert.fileUrl.replace(`${OLD_URL_PREFIX}uploads/`, '/uploads/public/');
        await prisma.userCertificate.update({ where: { id: cert.id }, data: { fileUrl: newUrl } });
    }
    console.log(`✅ Updated ${certs.length} UserCertificate public URLs.`);

    console.log('🎉 DB URL replacement complete!');
}

updateUrls()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
