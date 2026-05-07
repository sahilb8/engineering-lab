// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  // Create two households
  const householdA = await prisma.household.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Household A' },
  });

  const householdB = await prisma.household.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: 'Household B' },
  });

  // Feature flags: enable Budgets for A, disable for B
  await prisma.featureFlag.upsert({
    where: {
      householdId_moduleName: {
        householdId: householdA.id,
        moduleName: 'budgets',
      },
    },
    update: { isEnabled: true },
    create: {
      householdId: householdA.id,
      moduleName: 'budgets',
      isEnabled: true,
    },
  });

  await prisma.featureFlag.upsert({
    where: {
      householdId_moduleName: {
        householdId: householdB.id,
        moduleName: 'budgets',
      },
    },
    update: { isEnabled: false },
    create: {
      householdId: householdB.id,
      moduleName: 'budgets',
      isEnabled: false,
    },
  });

  // Accounts with bankName for bank-sync testing
  await prisma.account.upsert({
    where: { id: 1 },
    update: { bankName: 'chase' },
    create: {
      id: 1,
      name: 'Chase Checking',
      bankName: 'chase',
      balance: 4250.75,
      householdId: householdA.id,
    },
  });

  await prisma.account.upsert({
    where: { id: 2 },
    update: { bankName: 'wells_fargo' },
    create: {
      id: 2,
      name: 'Wells Fargo Savings',
      bankName: 'wells_fargo',
      balance: 8450.0,
      householdId: householdA.id,
    },
  });

  await prisma.account.upsert({
    where: { id: 3 },
    update: { bankName: 'chase' },
    create: {
      id: 3,
      name: 'Chase Business',
      bankName: 'chase',
      balance: 15000.0,
      householdId: householdB.id,
    },
  });

  // Feature flag: enable bank-sync for Household A, disable for B
  await prisma.featureFlag.upsert({
    where: {
      householdId_moduleName: {
        householdId: householdA.id,
        moduleName: 'bank-sync',
      },
    },
    update: { isEnabled: true },
    create: {
      householdId: householdA.id,
      moduleName: 'bank-sync',
      isEnabled: true,
    },
  });

  await prisma.featureFlag.upsert({
    where: {
      householdId_moduleName: {
        householdId: householdB.id,
        moduleName: 'bank-sync',
      },
    },
    update: { isEnabled: false },
    create: {
      householdId: householdB.id,
      moduleName: 'bank-sync',
      isEnabled: false,
    },
  });

  console.log('Seeded households:', householdA.name, householdB.name);
  console.log('Seeded feature flags: budgets enabled for A, disabled for B');
  console.log('Seeded feature flags: bank-sync enabled for A, disabled for B');
  console.log('Seeded accounts with bankName: chase (A), wells_fargo (A), chase (B)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
