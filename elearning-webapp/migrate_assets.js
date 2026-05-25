const { PrismaClient } = require('/home/ubuntu/lmsfda/elearning-api/node_modules/@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://elearning_user:elearning_password@localhost:5432/elearning_db'
    }
  }
});
const fs = require('fs');
const path = require('path');
const https = require('https');

const UPLOADS_DIR = '/var/www/html/uploads';

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function tryDownload(value, targetPath) {
  // If the value is a full URL, parse the path part after public/uploads/
  let fileKey = value;
  if (value.startsWith('http')) {
    const parts = value.split('/public/uploads/');
    if (parts.length > 1) {
      fileKey = parts[1];
    } else {
      fileKey = value.substring(value.lastIndexOf('/') + 1);
    }
  } else {
    // Local path, e.g. /uploads/public/images/filename.ext or signatures/filename.ext
    fileKey = value.replace(/^\/?uploads\//, '');
  }

  const supabaseUrlBase = 'https://axhzesrtlybenudgmtlm.supabase.co/storage/v1/object/public/uploads';
  
  // Construct URLs to try
  const urls = [
    `${supabaseUrlBase}/${fileKey}`
  ];

  // Also try default subfolders in case path mismatch
  const cleanKey = fileKey.split('?')[0];
  const basenameWithQuery = fileKey.substring(fileKey.lastIndexOf('/') + 1);
  const cleanBasename = cleanKey.substring(cleanKey.lastIndexOf('/') + 1);

  urls.push(`${supabaseUrlBase}/images/${basenameWithQuery}`);
  urls.push(`${supabaseUrlBase}/documents/${basenameWithQuery}`);
  urls.push(`${supabaseUrlBase}/signatures/${basenameWithQuery}`);
  urls.push(`${supabaseUrlBase}/certificates/${basenameWithQuery}`);
  urls.push(`${supabaseUrlBase}/secure/signatures/${basenameWithQuery}`);
  urls.push(`${supabaseUrlBase}/secure/certificates/${basenameWithQuery}`);

  urls.push(`${supabaseUrlBase}/images/${cleanBasename}`);
  urls.push(`${supabaseUrlBase}/documents/${cleanBasename}`);
  urls.push(`${supabaseUrlBase}/signatures/${cleanBasename}`);
  urls.push(`${supabaseUrlBase}/certificates/${cleanBasename}`);
  urls.push(`${supabaseUrlBase}/secure/signatures/${cleanBasename}`);
  urls.push(`${supabaseUrlBase}/secure/certificates/${cleanBasename}`);

  // Deduplicate URLs
  const uniqueUrls = [...new Set(urls)];

  for (const url of uniqueUrls) {
    try {
      await downloadFile(url, targetPath);
      console.log(`Successfully downloaded: ${url} -> ${targetPath}`);
      return true;
    } catch (e) {
      // Continue trying next url
    }
  }
  console.error(`Could not download ${fileKey} from any Supabase URL`);
  return false;
}

async function handleAsset(value, isSignature = false) {
  if (!value) return null;
  const isLocal = value.startsWith('/uploads/') || value.startsWith('signatures/') || value.startsWith('secure/');
  const isSupabase = value.startsWith('https://axhzesrtlybenudgmtlm.supabase.co');

  if (!isLocal && !isSupabase) {
    return value; // Skip external urls
  }

  // Parse filename by stripping query string
  const cleanUrl = value.split('?')[0];
  const filename = path.basename(cleanUrl);
  const ext = path.extname(filename).toLowerCase();
  
  let subfolder = 'images';
  let isPrivate = false;

  if (isSignature || value.includes('signatures')) {
    subfolder = 'signatures';
    isPrivate = true;
  } else if (ext === '.pdf') {
    subfolder = 'documents';
  }

  const visibility = isPrivate ? 'secure' : 'public';
  const targetDir = path.join(UPLOADS_DIR, visibility, subfolder);
  const targetPath = path.join(targetDir, filename);

  ensureDirSync(targetDir);

  let exists = fs.existsSync(targetPath);
  if (!exists) {
    exists = await tryDownload(value, targetPath);
  }

  if (exists) {
    if (isPrivate) {
      return `secure/signatures/${filename}`;
    } else {
      return `/uploads/public/${subfolder}/${filename}`;
    }
  }

  return value;
}

async function migrate() {
  console.log('Starting migration...');

  // 1. Courses
  try {
    const courses = await prisma.course.findMany();
    for (const course of courses) {
      const updatedImage = await handleAsset(course.image);
      const updatedAvatar = await handleAsset(course.instructorAvatar);
      if (updatedImage !== course.image || updatedAvatar !== course.instructorAvatar) {
        await prisma.course.update({
          where: { id: course.id },
          data: {
            image: updatedImage,
            instructorAvatar: updatedAvatar
          }
        });
        console.log(`Updated Course ${course.title}`);
      }
    }
  } catch (err) {
    console.error('Error migrating Courses:', err);
  }

  // 2. Announcements
  try {
    const announcements = await prisma.announcement.findMany();
    for (const a of announcements) {
      const updatedImage = await handleAsset(a.image);
      const updatedContentUrl = await handleAsset(a.contentUrl);
      if (updatedImage !== a.image || updatedContentUrl !== a.contentUrl) {
        await prisma.announcement.update({
          where: { id: a.id },
          data: {
            image: updatedImage,
            contentUrl: updatedContentUrl
          }
        });
        console.log(`Updated Announcement ${a.title}`);
      }
    }
  } catch (err) {
    console.error('Error migrating Announcements:', err);
  }

  // 3. InstructorPresets
  try {
    const instructors = await prisma.instructorPreset.findMany();
    for (const i of instructors) {
      const updatedAvatar = await handleAsset(i.avatar);
      const updatedSignature = await handleAsset(i.signatureImageUrl, true);
      if (updatedAvatar !== i.avatar || updatedSignature !== i.signatureImageUrl) {
        await prisma.instructorPreset.update({
          where: { id: i.id },
          data: {
            avatar: updatedAvatar,
            signatureImageUrl: updatedSignature
          }
        });
        console.log(`Updated Instructor ${i.name}`);
      }
    }
  } catch (err) {
    console.error('Error migrating InstructorPresets:', err);
  }

  // 4. OrganizationPresets
  try {
    const orgs = await prisma.organizationPreset.findMany();
    for (const o of orgs) {
      const updatedStamp = await handleAsset(o.stampImageUrl);
      const updatedSignature = await handleAsset(o.signatureImageUrl, true);
      if (updatedStamp !== o.stampImageUrl || updatedSignature !== o.signatureImageUrl) {
        await prisma.organizationPreset.update({
          where: { id: o.id },
          data: {
            stampImageUrl: updatedStamp,
            signatureImageUrl: updatedSignature
          }
        });
        console.log(`Updated Organization ${o.name}`);
      }
    }
  } catch (err) {
    console.error('Error migrating OrganizationPresets:', err);
  }

  // 5. Rewards
  try {
    const rewards = await prisma.reward.findMany();
    for (const r of rewards) {
      const updatedImage = await handleAsset(r.image);
      if (updatedImage !== r.image) {
        await prisma.reward.update({
          where: { id: r.id },
          data: { image: updatedImage }
        });
        console.log(`Updated Reward ${r.name}`);
      }
    }
  } catch (err) {
    console.error('Error migrating Rewards:', err);
  }

  // 6. Lessons
  try {
    const lessons = await prisma.lesson.findMany();
    for (const l of lessons) {
      if (l.type === 'pdf') {
        const updatedContentUrl = await handleAsset(l.contentUrl);
        if (updatedContentUrl !== l.contentUrl) {
          await prisma.lesson.update({
            where: { id: l.id },
            data: { contentUrl: updatedContentUrl }
          });
          console.log(`Updated Lesson PDF ${l.title}`);
        }
      }
    }
  } catch (err) {
    console.error('Error migrating Lessons:', err);
  }

  console.log('Migration finished successfully!');
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
