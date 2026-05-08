import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const baseUrl = process.env.DATABASE_URL!.split('?')[0];
const adapter = new PrismaPg(
  { connectionString: baseUrl },
  { schema: 'finance_tracker' },
);
const prisma = new PrismaClient({ adapter });

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

  // Users
  const ownerUser = await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      email: 'owner@household-a.com',
      name: 'Alice Owner',
      householdId: householdA.id,
    },
  });

  const memberUser = await prisma.user.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      email: 'member@household-a.com',
      name: 'Bob Member',
      householdId: householdA.id,
    },
  });

  const viewerUser = await prisma.user.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      email: 'owner@household-b.com',
      name: 'Charlie Owner',
      householdId: householdB.id,
    },
  });

  // All permission keys across all modules
  const ALL_PERMISSIONS = [
    'accounts:create', 'accounts:read', 'accounts:edit', 'accounts:delete',
    'users:create', 'users:read', 'users:edit', 'users:delete',
    'households:create', 'households:read', 'households:edit', 'households:delete',
    'transactions:create', 'transactions:read', 'transactions:edit', 'transactions:delete',
    'categories:create', 'categories:read', 'categories:edit', 'categories:delete',
    'budgets:create', 'budgets:read', 'budgets:edit', 'budgets:delete',
    'bank-sync:execute', 'bank-sync:read',
    'roles:create', 'roles:read', 'roles:edit', 'roles:delete', 'roles:assign', 'roles:unassign',
  ];

  const MEMBER_PERMISSIONS = [
    'accounts:create', 'accounts:read', 'accounts:edit',
    'users:read',
    'households:read',
    'transactions:create', 'transactions:read', 'transactions:edit',
    'categories:read',
    'budgets:create', 'budgets:read', 'budgets:edit',
    'bank-sync:execute', 'bank-sync:read',
    'roles:create', 'roles:read', 'roles:assign',
  ];

  const VIEWER_PERMISSIONS = [
    'accounts:read',
    'users:read',
    'households:read',
    'transactions:read',
    'categories:read',
    'budgets:read',
    'bank-sync:read',
    'roles:read',
  ];

  // Custom roles for Household A
  const ownerRoleA = await prisma.customRole.upsert({
    where: { householdId_name: { householdId: householdA.id, name: 'Owner' } },
    update: { permissions: ALL_PERMISSIONS },
    create: {
      name: 'Owner',
      householdId: householdA.id,
      permissions: ALL_PERMISSIONS,
    },
  });

  const memberRoleA = await prisma.customRole.upsert({
    where: { householdId_name: { householdId: householdA.id, name: 'Member' } },
    update: { permissions: MEMBER_PERMISSIONS },
    create: {
      name: 'Member',
      householdId: householdA.id,
      permissions: MEMBER_PERMISSIONS,
    },
  });

  const viewerRoleA = await prisma.customRole.upsert({
    where: { householdId_name: { householdId: householdA.id, name: 'Viewer' } },
    update: { permissions: VIEWER_PERMISSIONS },
    create: {
      name: 'Viewer',
      householdId: householdA.id,
      permissions: VIEWER_PERMISSIONS,
    },
  });

  // Custom roles for Household B
  const ownerRoleB = await prisma.customRole.upsert({
    where: { householdId_name: { householdId: householdB.id, name: 'Owner' } },
    update: { permissions: ALL_PERMISSIONS },
    create: {
      name: 'Owner',
      householdId: householdB.id,
      permissions: ALL_PERMISSIONS,
    },
  });

  // Assign roles to users
  await prisma.userRoleAssignment.upsert({
    where: { userId_roleId: { userId: ownerUser.id, roleId: ownerRoleA.id } },
    update: {},
    create: { userId: ownerUser.id, roleId: ownerRoleA.id },
  });

  await prisma.userRoleAssignment.upsert({
    where: { userId_roleId: { userId: memberUser.id, roleId: memberRoleA.id } },
    update: {},
    create: { userId: memberUser.id, roleId: memberRoleA.id },
  });

  await prisma.userRoleAssignment.upsert({
    where: { userId_roleId: { userId: viewerUser.id, roleId: ownerRoleB.id } },
    update: {},
    create: { userId: viewerUser.id, roleId: ownerRoleB.id },
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
  console.log('Seeded users: Alice (owner, A), Bob (member, A), Charlie (owner, B)');
  console.log('Seeded custom roles: Owner/Member/Viewer for A, Owner for B');
  console.log('Seeded role assignments: Alice→Owner, Bob→Member, Charlie→Owner');
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
