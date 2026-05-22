const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importUsers() {
  console.log('🔄 Starting user import process...');

  try {
    // 1. Read JSON data
    const dataPath = path.join(__dirname, 'users_data.json');
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Data file not found at ${dataPath}. Please ensure users_data.json is present.`);
    }
    
    const usersData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`📦 Loaded ${usersData.length} users from users_data.json`);

    const adminEmailToPreserve = 'chakpetch@scaleup.co.th';

    // 2. Clear existing users (except admin)
    console.log(`🧹 Deleting all users except '${adminEmailToPreserve}'...`);
    const deleteResult = await prisma.user.deleteMany({
      where: {
        email: { not: adminEmailToPreserve }
      }
    });
    console.log(`✅ Deleted ${deleteResult.count} old users.`);

    // 3. Insert new users
    console.log('📥 Inserting new users into database...');
    let insertedCount = 0;
    
    // Using a loop instead of createMany to handle any duplicates or errors gracefully
    for (const user of usersData) {
      try {
        // Ensure email is lowercase and trimmed
        user.email = user.email.toLowerCase().trim();
        
        await prisma.user.upsert({
          where: { email: user.email },
          update: user, // If somehow exists, update it
          create: user
        });
        insertedCount++;
      } catch (err) {
        console.error(`❌ Failed to insert user ${user.email}: ${err.message}`);
      }
    }

    console.log(`🎉 Successfully imported ${insertedCount} users!`);

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importUsers();
