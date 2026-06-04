const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const target8Updates = {
  "ณฐนนพรรณ ภควัฒน์ชัยกุล": { oldEmail: "placeholder2@lmsfda.com", newEmail: "kae.np2463@gmail.com" },
  "บุญญารัสมิ์ ภูริชโรจนวัฒน์": { oldEmail: "placeholder136@lmsfda.com", newEmail: "bphuritrojanawat@gmail.com" },
  "ปนัสดา ชื่นสกุล": { oldEmail: "placeholder5@lmsfda.com", newEmail: "panasda.c@fda.moph.go.th" },
  "ปาริษา สุภาภรรณ": { oldEmail: "placeholder11@lmsfda.com", newEmail: "parisasupapan@gmail.com" },
  "วรรณนิสา สุดทรวง": { oldEmail: "placeholder4@lmsfda.com", newEmail: "wannisa.sudsuang@gmail.com" },
  "อภิษฎา ชูสถาน": { oldEmail: "placeholder137@lmsfda.com", newEmail: "apisada.cho@gmail.com" },
  "จุฑามาศ สุพรรณชัย": { oldEmail: "placeholder1@lmsfda.com", newEmail: "cmbk66@gmail.com" },
  "ขนิษฐา อ่อนเถื่อน": { oldEmail: "placeholder3@lmsfda.com", newEmail: "kanittha.o@fda.moph.go.th" }
};

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const excelArg = args.find(arg => arg.endsWith('.xlsx'));
  
  const excelFilePath = excelArg || "C:\\Users\\AlexWang\\Downloads\\users_profile_report_02.06.2569  Password.xlsx";

  console.log(`=== MIGRATION SCRIPT STARTED ===`);
  console.log(`Excel File: ${excelFilePath}`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN (No changes will be written)' : 'LIVE-COMMIT (Changes will be written to DB)'}`);

  if (!fs.existsSync(excelFilePath)) {
    console.error(`Error: Excel file does not exist at: ${excelFilePath}`);
    process.exit(1);
  }

  const workbook = xlsx.readFile(excelFilePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const excelRows = xlsx.utils.sheet_to_json(sheet);

  console.log(`Total rows in Excel: ${excelRows.length}`);

  try {
    console.log("Preparing updates and pre-hashing passwords (this may take a few seconds)...");
    const preparedUpdates = [];

    for (const row of excelRows) {
      const firstName = (row["First Name"] || "").trim();
      const lastName = (row["Last Name"] || "").trim();
      const fullName = `${firstName} ${lastName}`;
      const excelEmail = (row["Email"] || "").trim().toLowerCase();
      const rawPassword = String(row["Password"] || "").trim();

      if (!rawPassword) {
        console.warn(`[WARNING] Skip user ${fullName} - No password provided in Excel`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      const emailUpdate = target8Updates[fullName];

      preparedUpdates.push({
        fullName,
        excelEmail,
        hashedPassword,
        emailUpdate
      });
    }

    console.log(`Prepared ${preparedUpdates.length} records. Starting database transaction...`);

    await prisma.$transaction(async (tx) => {
      let updatedCount = 0;
      let emailUpdatesCount = 0;

      for (const updateInfo of preparedUpdates) {
        const { fullName, excelEmail, hashedPassword, emailUpdate } = updateInfo;

        if (emailUpdate) {
          // Case 1: One of the 8 users whose emails need updating
          const dbUser = await tx.user.findUnique({
            where: { email: emailUpdate.oldEmail }
          });

          if (!dbUser) {
            console.error(`[ERROR] Target 8 user not found in DB by old email: ${fullName} (${emailUpdate.oldEmail})`);
            continue;
          }

          console.log(`[EMAIL UPDATE & PASSWORD RESET] Name: "${fullName}"`);
          console.log(`  - Old Email: ${emailUpdate.oldEmail} -> New Email: ${excelEmail}`);
          console.log(`  - Set mustChangePassword: true`);

          await tx.user.update({
            where: { id: dbUser.id },
            data: {
              email: excelEmail,
              password: hashedPassword,
              mustChangePassword: true
            }
          });

          emailUpdatesCount++;
          updatedCount++;
        } else {
          // Case 2: Regular user matching by email
          const dbUser = await tx.user.findUnique({
            where: { email: excelEmail }
          });

          if (!dbUser) {
            // Safety fallback: Check if user exists by exact name if email matching failed
            const dbUserByName = await tx.user.findFirst({
              where: { name: fullName }
            });

            if (dbUserByName) {
              console.log(`[PASSWORD RESET (NAME-MATCH)] Name: "${fullName}" | DB Email: "${dbUserByName.email}"`);
              await tx.user.update({
                where: { id: dbUserByName.id },
                data: {
                  password: hashedPassword,
                  mustChangePassword: true
                }
              });
              updatedCount++;
            } else {
              console.warn(`[WARNING] User "${fullName}" with email "${excelEmail}" not found in DB. Skipping.`);
            }
          } else {
            // Matched by email perfectly
            console.log(`[PASSWORD RESET] Name: "${fullName}" | Email: "${excelEmail}"`);
            await tx.user.update({
              where: { id: dbUser.id },
              data: {
                password: hashedPassword,
                mustChangePassword: true
              }
            });
            updatedCount++;
          }
        }
      }

      console.log(`\n--- Transaction Processing Summary ---`);
      console.log(`Emails updated: ${emailUpdatesCount}`);
      console.log(`Total users updated/processed: ${updatedCount}`);

      if (dryRun) {
        console.log(`\n[DRY-RUN] Rolling back transaction as requested...`);
        throw new Error("DRY_RUN_ROLLBACK");
      }
    }, {
      maxWait: 90000,
      timeout: 90000
    });

    console.log(`\n✅ Migration completed successfully (LIVE-COMMIT).`);
  } catch (error) {
    if (error.message === "DRY_RUN_ROLLBACK") {
      console.log(`\n✅ Dry-run completed successfully. Database changes rolled back cleanly.`);
    } else {
      console.error(`\n❌ Migration failed:`, error);
      process.exit(1);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
