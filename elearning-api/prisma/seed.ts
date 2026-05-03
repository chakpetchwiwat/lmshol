import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create Categories
  const catCompliance = await prisma.category.upsert({
    where: { name: 'Compliance' },
    update: {},
    create: { name: 'Compliance', order: 1 }
  });
  
  const catSoftSkills = await prisma.category.upsert({
    where: { name: 'Soft Skills' },
    update: {},
    create: { name: 'Soft Skills', order: 2 }
  });

  const catHardSkills = await prisma.category.upsert({
    where: { name: 'Hard Skills' },
    update: {},
    create: { name: 'Hard Skills', order: 3 }
  });

  // Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: { password: adminPassword },
    create: {
      email: 'admin@company.com',
      name: 'System Admin',
      password: adminPassword,
      role: 'admin',
      department: 'IT'
    }
  });

  // Create Test User
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@company.com' },
    update: { password: userPassword },
    create: {
      email: 'user@company.com',
      name: 'อเล็กซ์ หวัง',
      password: userPassword,
      role: 'user',
      department: 'HRD'
    }
  });

  // Create Certificate Templates
  console.log('Seeding Certificate Templates...');
  const templates = [
    {
      id: 'CLASSIC_001',
      name: 'Classic Elegance',
      description: 'Traditional formal design with decorative borders and gold accents.',
      templateHtml: '', // Not used for native PDF, but required by schema
      templateCss: '',
      isDefault: true
    },
    {
      id: 'MODERN_001',
      name: 'Modern Professional',
      description: 'Clean, asymmetrical design with bold typography and vibrant accents.',
      templateHtml: '',
      templateCss: '',
      isDefault: false
    },
    {
      id: 'MINIMAL_001',
      name: 'Minimalist Premium',
      description: 'High whitespace and sophisticated typography for a luxury feel.',
      templateHtml: '',
      templateCss: '',
      isDefault: false
    }
  ];

  for (const t of templates) {
    await prisma.certificateTemplate.upsert({
      where: { id: t.id },
      update: {
        name: t.name,
        description: t.description,
        isDefault: t.isDefault
      },
      create: t
    });
  }

  console.log(`Seeding finished. Admin: ${admin.email}, User: ${user.email}`);
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
