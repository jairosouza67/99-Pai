import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// Role enum matching the schema
const Role = {
  elderly: 'elderly',
  caregiver: 'caregiver',
  provider: 'provider',
  admin: 'admin',
} as const;

type RoleType = (typeof Role)[keyof typeof Role];

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ==========================================================================
  // USERS
  // ==========================================================================
  console.log('Creating users...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  // 1. Elderly User - Maria Silva
  const elderlyUser = await prisma.user.upsert({
    where: { email: 'elderly@test.com' },
    update: {},
    create: {
      email: 'elderly@test.com',
      password: hashedPassword,
      name: 'Maria Silva',
      role: Role.elderly as RoleType,
      cellphone: '+5511999990001',
    },
  });
  console.log(`  ✓ Created elderly user: ${elderlyUser.email}`);

  // 2. Caregiver User - João Santos
  const caregiverUser = await prisma.user.upsert({
    where: { email: 'caregiver@test.com' },
    update: {},
    create: {
      email: 'caregiver@test.com',
      password: hashedPassword,
      name: 'João Santos',
      role: Role.caregiver as RoleType,
      cellphone: '+5511999990002',
    },
  });
  console.log(`  ✓ Created caregiver user: ${caregiverUser.email}`);

  // 3. Provider User - Ana Oliveira
  const providerUser = await prisma.user.upsert({
    where: { email: 'provider@test.com' },
    update: {},
    create: {
      email: 'provider@test.com',
      password: hashedPassword,
      name: 'Ana Oliveira',
      role: Role.provider as RoleType,
      cellphone: '+5511999990003',
    },
  });
  console.log(`  ✓ Created provider user: ${providerUser.email}`);

  // 4. Admin User - Carlos Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Carlos Admin',
      role: Role.admin as RoleType,
      cellphone: '+5511999990004',
    },
  });
  console.log(`  ✓ Created admin user: ${adminUser.email}`);

  // ==========================================================================
  // ELDERLY PROFILE
  // ==========================================================================
  console.log('Creating elderly profile...');

  const elderlyProfile = await prisma.elderlyprofile.upsert({
    where: { userId: elderlyUser.id },
    update: {},
    create: {
      userId: elderlyUser.id,
      preferredName: 'Maria',
      autonomyScore: 75,
      location: 'São Paulo, SP',
      onboardingComplete: true,
      linkCode: 'MAR123',
      interactionTimes: ['08:00', '12:00', '16:00', '19:00'],
    },
  });
  console.log(`  ✓ Created elderly profile for: ${elderlyProfile.preferredName}`);

  // ==========================================================================
  // CAREGIVER LINK
  // ==========================================================================
  console.log('Creating caregiver link...');

  await prisma.caregiverlink.upsert({
    where: {
      caregiverUserId_elderlyProfileId: {
        caregiverUserId: caregiverUser.id,
        elderlyProfileId: elderlyProfile.id,
      },
    },
    update: {},
    create: {
      caregiverUserId: caregiverUser.id,
      elderlyProfileId: elderlyProfile.id,
    },
  });
  console.log(`  ✓ Linked caregiver ${caregiverUser.name} to elderly ${elderlyProfile.preferredName}`);

  // ==========================================================================
  // CATEGORIES (Hierarchical)
  // ==========================================================================
  console.log('Creating categories...');

  // Parent Category: Saúde e Bem-estar
  const healthCategory = await prisma.category.upsert({
    where: { id: 'cat-health' },
    update: { name: 'Saúde e Bem-estar' },
    create: {
      id: 'cat-health',
      name: 'Saúde e Bem-estar',
      parentId: null,
    },
  });

  // Subcategories for Saúde e Bem-estar
  const homeCareCategory = await prisma.category.upsert({
    where: { id: 'cat-home-care' },
    update: { name: 'Cuidado Domiciliar', parentId: healthCategory.id },
    create: {
      id: 'cat-home-care',
      name: 'Cuidado Domiciliar',
      parentId: healthCategory.id,
    },
  });

  await prisma.category.upsert({
    where: { id: 'cat-physio' },
    update: { name: 'Fisioterapia', parentId: healthCategory.id },
    create: {
      id: 'cat-physio',
      name: 'Fisioterapia',
      parentId: healthCategory.id,
    },
  });

  await prisma.category.upsert({
    where: { id: 'cat-nursing' },
    update: { name: 'Enfermagem', parentId: healthCategory.id },
    create: {
      id: 'cat-nursing',
      name: 'Enfermagem',
      parentId: healthCategory.id,
    },
  });

  // Parent Category: Serviços Domésticos
  const homeServicesCategory = await prisma.category.upsert({
    where: { id: 'cat-home-services' },
    update: { name: 'Serviços Domésticos' },
    create: {
      id: 'cat-home-services',
      name: 'Serviços Domésticos',
      parentId: null,
    },
  });

  // Subcategories for Serviços Domésticos
  await prisma.category.upsert({
    where: { id: 'cat-cleaning' },
    update: { name: 'Limpeza', parentId: homeServicesCategory.id },
    create: {
      id: 'cat-cleaning',
      name: 'Limpeza',
      parentId: homeServicesCategory.id,
    },
  });

  await prisma.category.upsert({
    where: { id: 'cat-maintenance' },
    update: { name: 'Manutenção', parentId: homeServicesCategory.id },
    create: {
      id: 'cat-maintenance',
      name: 'Manutenção',
      parentId: homeServicesCategory.id,
    },
  });

  // Parent Category: Transporte
  const transportCategory = await prisma.category.upsert({
    where: { id: 'cat-transport' },
    update: { name: 'Transporte' },
    create: {
      id: 'cat-transport',
      name: 'Transporte',
      parentId: null,
    },
  });

  // Subcategories for Transporte
  await prisma.category.upsert({
    where: { id: 'cat-escort' },
    update: { name: 'Acompanhamento', parentId: transportCategory.id },
    create: {
      id: 'cat-escort',
      name: 'Acompanhamento',
      parentId: transportCategory.id,
    },
  });

  await prisma.category.upsert({
    where: { id: 'cat-medical-transport' },
    update: { name: 'Transporte Médico', parentId: transportCategory.id },
    create: {
      id: 'cat-medical-transport',
      name: 'Transporte Médico',
      parentId: transportCategory.id,
    },
  });

  // Parent Category: Alimentação
  const foodCategory = await prisma.category.upsert({
    where: { id: 'cat-food' },
    update: { name: 'Alimentação' },
    create: {
      id: 'cat-food',
      name: 'Alimentação',
      parentId: null,
    },
  });

  // Subcategories for Alimentação
  await prisma.category.upsert({
    where: { id: 'cat-ready-meals' },
    update: { name: 'Refeições Prontas', parentId: foodCategory.id },
    create: {
      id: 'cat-ready-meals',
      name: 'Refeições Prontas',
      parentId: foodCategory.id,
    },
  });

  await prisma.category.upsert({
    where: { id: 'cat-nutrition' },
    update: { name: 'Nutrição', parentId: foodCategory.id },
    create: {
      id: 'cat-nutrition',
      name: 'Nutrição',
      parentId: foodCategory.id,
    },
  });

  console.log('  ✓ Created all categories');

  // ==========================================================================
  // SAMPLE OFFERING
  // ==========================================================================
  console.log('Creating sample offering...');

  await prisma.offering.upsert({
    where: { id: 'offering-sample-1' },
    update: {},
    create: {
      id: 'offering-sample-1',
      title: 'Cuidado Domiciliar Especializado',
      description:
        'Serviço de cuidado personalizado para idosos, incluindo acompanhamento diário, auxílio com medicamentos, alimentação e atividades do dia a dia. Profissional com experiência e certificação em cuidados geriátricos.',
      price: 150.0,
      active: true,
      userId: providerUser.id,
      categoryId: healthCategory.id,
      subcategoryId: homeCareCategory.id,
    },
  });
  console.log('  ✓ Created sample offering');

  // ==========================================================================
  // SAMPLE MEDICATIONS
  // ==========================================================================
  console.log('Creating sample medications...');

  await prisma.medication.upsert({
    where: { id: 'med-losartana' },
    update: {},
    create: {
      id: 'med-losartana',
      elderlyProfileId: elderlyProfile.id,
      name: 'Losartana 50mg',
      time: '08:00',
      dosage: '1 comprimido',
      active: true,
    },
  });

  await prisma.medication.upsert({
    where: { id: 'med-metformina' },
    update: {},
    create: {
      id: 'med-metformina',
      elderlyProfileId: elderlyProfile.id,
      name: 'Metformina 500mg',
      time: '12:00',
      dosage: '1 comprimido',
      active: true,
    },
  });

  console.log('  ✓ Created sample medications');

  // ==========================================================================
  // SAMPLE AGENDA EVENT
  // ==========================================================================
  console.log('Creating sample agenda event...');

  // Create event for tomorrow at 14:00
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);

  await prisma.agendaevent.upsert({
    where: { id: 'event-consulta' },
    update: {},
    create: {
      id: 'event-consulta',
      elderlyProfileId: elderlyProfile.id,
      description: 'Consulta médica',
      dateTime: tomorrow,
      reminder: true,
    },
  });

  console.log('  ✓ Created sample agenda event');

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n✅ Seeding completed successfully!');
  console.log('\n📋 Test accounts:');
  console.log('  - elderly@test.com / 123456 (Elderly - Maria Silva)');
  console.log('  - caregiver@test.com / 123456 (Caregiver - João Santos)');
  console.log('  - provider@test.com / 123456 (Provider - Ana Oliveira)');
  console.log('  - admin@test.com / 123456 (Admin - Carlos Admin)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
