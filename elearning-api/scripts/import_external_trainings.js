const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const fs = require('fs');

const prisma = new PrismaClient();

async function importExternalTrainings() {
  console.log('🔄 Starting external trainings import process...');

  try {
    // Allow passing path as argument, fallback to local path
    const excelPath = process.argv[2] || 'external_training_report.xlsx';
    if (!fs.existsSync(excelPath)) {
      throw new Error(`File not found at ${excelPath}. Please ensure the file exists or pass the path as an argument.`);
    }

    // 1. Read Excel file
    console.log(`📖 Reading Excel file: ${excelPath}`);
    const wb = xlsx.readFile(excelPath);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    console.log(`📦 Found ${data.length} records in Excel.`);

    // 2. Fetch all users from DB to match by name
    const users = await prisma.user.findMany({
      select: { id: true, name: true }
    });
    
    // Create a map of name -> userId for fast lookup
    const userMap = new Map();
    users.forEach(u => {
      // Normalize name for better matching
      const normalizedName = u.name.trim().toLowerCase();
      userMap.set(normalizedName, u.id);
    });

    console.log(`👥 Loaded ${userMap.size} users from database.`);

    let insertedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    // 3. Process each row
    console.log('📥 Inserting external training records...');
    for (const row of data) {
      const fullName = (row['Full Name'] || '').trim();
      if (!fullName) continue;

      const userId = userMap.get(fullName.toLowerCase());
      
      if (!userId) {
        // console.log(`⚠️ User not found in DB: ${fullName}`);
        notFoundCount++;
        continue;
      }

      const courseName = row['Course Name']?.trim();
      const organizingAgency = row['Organizing Agency']?.trim() || 'ภายนอก';
      const completionDateStr = row['Completion Date']?.trim();
      
      if (!courseName) {
        skippedCount++;
        continue;
      }

      let issueDate = null;
      if (completionDateStr) {
        try {
          // Parse "Friday, 2 June 2023, 2:57 PM" -> "2 June 2023, 2:57 PM"
          const datePart = completionDateStr.split(',').slice(1).join(',').trim();
          issueDate = new Date(datePart);
          if (isNaN(issueDate.getTime())) {
            issueDate = null;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      // Check if this certificate already exists for this user to avoid duplicates
      const existing = await prisma.userCertificate.findFirst({
        where: {
          userId,
          title: courseName,
          issuer: organizingAgency
        }
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Insert new external certificate
      await prisma.userCertificate.create({
        data: {
          userId,
          title: courseName,
          issuer: organizingAgency,
          issueDate,
          noExpiration: true // External trainings usually don't expire unless specified
        }
      });
      
      insertedCount++;
    }

    console.log('----------------------------------------');
    console.log(`🎉 Import Summary:`);
    console.log(`   ✅ Successfully imported: ${insertedCount}`);
    console.log(`   ⏭️  Skipped (Duplicate/Invalid): ${skippedCount}`);
    console.log(`   ❌ Users not found in DB: ${notFoundCount}`);
    console.log('----------------------------------------');

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importExternalTrainings();
