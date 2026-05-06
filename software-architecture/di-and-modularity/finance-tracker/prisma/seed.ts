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

  console.log('Seeded households:', householdA.name, householdB.name);
  console.log('Seeded feature flags: budgets enabled for A, disabled for B');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
