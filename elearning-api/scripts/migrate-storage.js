require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs/promises');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const BUCKETS = [
  { name: 'uploads', dest: 'public' },
  { name: 'secure-documents', dest: 'secure' }
];

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function downloadFile(bucket, filePath, destDir) {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(filePath);
    if (error) throw error;
    
    const buffer = Buffer.from(await data.arrayBuffer());
    const destPath = path.join(destDir, filePath);
    await ensureDir(path.dirname(destPath));
    await fs.writeFile(destPath, buffer);
    console.log(`✅ Downloaded: ${bucket}/${filePath}`);
  } catch (err) {
    console.error(`❌ Error downloading ${bucket}/${filePath}:`, err.message);
  }
}

async function listAndDownload(bucket, currentPath, destDir) {
  const { data, error } = await supabase.storage.from(bucket).list(currentPath);
  if (error) {
    console.error(`Error listing ${bucket}/${currentPath}:`, error.message);
    return;
  }

  for (const item of data) {
    // If it has no id, it's usually a folder
    if (!item.id && item.name !== '.emptyFolderPlaceholder') {
      await listAndDownload(bucket, currentPath ? `${currentPath}/${item.name}` : item.name, destDir);
    } else if (item.id) {
      const filePath = currentPath ? `${currentPath}/${item.name}` : item.name;
      await downloadFile(bucket, filePath, destDir);
    }
  }
}

async function main() {
  console.log('🚀 Starting Supabase Storage Migration...');
  for (const bucket of BUCKETS) {
    const destDir = path.join(UPLOADS_DIR, bucket.dest);
    console.log(`\n📦 Processing bucket: ${bucket.name} -> ${destDir}`);
    await listAndDownload(bucket.name, '', destDir);
  }
  console.log('\n🎉 Migration complete!');
}

main().catch(console.error);
