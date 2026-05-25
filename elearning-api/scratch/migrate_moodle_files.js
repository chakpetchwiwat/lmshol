const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const MOODLE_LOGIN_URL = 'https://lms.fda.moph.go.th/login/index.php';
const USERNAME = 'admin';
const PASSWORD = 'P@ssw0rd34';

const UPLOADS_DIR = process.env.NODE_ENV === 'production' ? '/var/www/html/uploads' : path.join(__dirname, '../uploads');
const SECURE_DIR = path.join(UPLOADS_DIR, 'secure', 'certificates');

async function ensureDir(dirPath) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

// Helper to extract logintoken from Noodle HTML
function extractLoginToken(html) {
    const match = html.match(/name="logintoken" value="([^"]+)"/);
    return match ? match[1] : null;
}

// Helper to extract MoodleSession cookie from Response Headers
function getCookie(headers) {
    const setCookie = headers['set-cookie'];
    if (!setCookie) return null;
    const sessionCookie = setCookie.find(c => c.startsWith('MoodleSession'));
    return sessionCookie ? sessionCookie.split(';')[0] : null;
}

async function loginToMoodle() {
    console.log('Fetching Moodle login page...');
    const getRes = await axios.get(MOODLE_LOGIN_URL);
    const loginToken = extractLoginToken(getRes.data);
    if (!loginToken) {
        throw new Error('Could not find logintoken on login page.');
    }
    console.log('Found logintoken:', loginToken);

    const initialCookie = getCookie(getRes.headers);
    console.log('Initial cookie:', initialCookie);

    // Prepare POST data
    const params = new URLSearchParams();
    params.append('username', USERNAME);
    params.append('password', PASSWORD);
    params.append('logintoken', loginToken);

    console.log('Sending login credentials...');
    const postRes = await axios.post(MOODLE_LOGIN_URL, params.toString(), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': initialCookie || ''
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
    });

    const sessionCookie = getCookie(postRes.headers) || initialCookie;
    console.log('Session Cookie:', sessionCookie);
    return sessionCookie;
}

async function run() {
    await ensureDir(SECURE_DIR);
    let cookie;
    try {
        cookie = await loginToMoodle();
    } catch (e) {
        console.error('Failed to log in to Moodle:', e.message);
        process.exit(1);
    }

    // Now query users who have Moodle links in profileFiles
    const users = await prisma.user.findMany({
        where: {
            profileFiles: { not: null }
        }
    });

    console.log(`Analyzing ${users.length} users...`);
    let migratedCount = 0;

    for (const user of users) {
        const files = user.profileFiles;
        if (!files || typeof files !== 'object') continue;

        let needsUpdate = false;
        let cvUrl = files.cv;
        let jdUrl = files.jobDescription;

        // Also check if files is already an array and has lms.fda.moph.go.th links in fileUrl/fileKey
        let filesArray = [];
        const isArrayFormat = Array.isArray(files);
        if (isArrayFormat) {
            filesArray = files;
        } else {
            // Convert to array format for future compatibility
            if (cvUrl) {
                filesArray.push({
                    id: 'cv',
                    title: 'CV (Curriculum Vitae)',
                    fileName: 'CV_imported.pdf',
                    fileKey: '',
                    fileUrl: cvUrl,
                    fileMimeType: 'application/pdf',
                    uploadedAt: new Date().toISOString()
                });
            }
            if (jdUrl) {
                filesArray.push({
                    id: 'jd',
                    title: 'Job Description',
                    fileName: 'Job_Description_imported.pdf',
                    fileKey: '',
                    fileUrl: jdUrl,
                    fileMimeType: 'application/pdf',
                    uploadedAt: new Date().toISOString()
                });
            }
        }

        // Process files in the array
        const updatedFilesArray = [];
        for (const file of filesArray) {
            const fileUrl = file.fileUrl || '';
            if (fileUrl.includes('lms.fda.moph.go.th')) {
                console.log(`Downloading file for user: ${user.name} (${user.email}) - url: ${fileUrl}`);
                try {
                    // Get filename from Moodle URL or headers
                    let originalName = 'file';
                    const parts = fileUrl.split('/');
                    const lastPart = parts[parts.length - 1];
                    if (lastPart) {
                        originalName = lastPart.split('?')[0];
                    }
                    const ext = path.extname(originalName) || '.pdf';
                    
                    const fileKey = `secure/certificates/${crypto.randomUUID()}${ext.toLowerCase()}`;
                    const absolutePath = path.join(UPLOADS_DIR, fileKey);

                    // Fetch the file using Moodle cookie
                    const res = await axios.get(fileUrl, {
                        headers: { 'Cookie': cookie },
                        responseType: 'arraybuffer'
                    });

                    await fs.writeFile(absolutePath, res.data);
                    console.log(`Saved file to: ${absolutePath}`);

                    updatedFilesArray.push({
                        id: file.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                        title: file.title || (file.id === 'cv' ? 'CV (Curriculum Vitae)' : 'Job Description'),
                        fileName: originalName,
                        fileKey: fileKey,
                        fileUrl: '', // Secure files don't have public fileUrl
                        fileMimeType: res.headers['content-type'] || file.fileMimeType || 'application/pdf',
                        uploadedAt: new Date().toISOString()
                    });
                    needsUpdate = true;
                    migratedCount++;
                } catch (err) {
                    console.error(`Failed to download ${fileUrl}:`, err.message);
                    // Keep original link if download failed
                    updatedFilesArray.push(file);
                }
            } else {
                updatedFilesArray.push(file);
            }
        }

        if (needsUpdate) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    profileFiles: updatedFilesArray
                }
            });
            console.log(`Updated database record for user: ${user.name}`);
        }
    }

    console.log(`Migration finished. Total files migrated: ${migratedCount}`);
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
