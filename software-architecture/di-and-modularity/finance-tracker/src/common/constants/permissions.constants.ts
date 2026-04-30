// Each permission follows the pattern: MODULE_ACTION
// Used with @Permissions() decorator and PermissionsGuard

// Households
export const HOUSEHOLDS_CREATE = 'households:create';
export const HOUSEHOLDS_READ = 'households:read';
export const HOUSEHOLDS_EDIT = 'households:edit';
export const HOUSEHOLDS_DELETE = 'households:delete';

// Users
export const USERS_CREATE = 'users:create';
export const USERS_READ = 'users:read';
export const USERS_EDIT = 'users:edit';
export const USERS_DELETE = 'users:delete';

// Accounts
export const ACCOUNTS_CREATE = 'accounts:create';
export const ACCOUNTS_READ = 'accounts:read';
export const ACCOUNTS_EDIT = 'accounts:edit';
export const ACCOUNTS_DELETE = 'accounts:delete';

// Transactions
export const TRANSACTIONS_CREATE = 'transactions:create';
export const TRANSACTIONS_READ = 'transactions:read';
export const TRANSACTIONS_EDIT = 'transactions:edit';
export const TRANSACTIONS_DELETE = 'transactions:delete';

// Categories
export const CATEGORIES_CREATE = 'categories:create';
export const CATEGORIES_READ = 'categories:read';
export const CATEGORIES_EDIT = 'categories:edit';
export const CATEGORIES_DELETE = 'categories:delete';

// Role-to-permission mapping
// This is where you define what each role can do
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: [
    HOUSEHOLDS_CREATE,
    HOUSEHOLDS_READ,
    HOUSEHOLDS_EDIT,
    HOUSEHOLDS_DELETE,
    USERS_CREATE,
    USERS_READ,
    USERS_EDIT,
    USERS_DELETE,
    ACCOUNTS_CREATE,
    ACCOUNTS_READ,
    ACCOUNTS_EDIT,
    ACCOUNTS_DELETE,
    TRANSACTIONS_CREATE,
    TRANSACTIONS_READ,
    TRANSACTIONS_EDIT,
    TRANSACTIONS_DELETE,
    CATEGORIES_CREATE,
    CATEGORIES_READ,
    CATEGORIES_EDIT,
    CATEGORIES_DELETE,
  ],
  MEMBER: [
    HOUSEHOLDS_READ,
    USERS_READ,
    ACCOUNTS_CREATE,
    ACCOUNTS_READ,
    ACCOUNTS_EDIT,
    TRANSACTIONS_CREATE,
    TRANSACTIONS_READ,
    TRANSACTIONS_EDIT,
    CATEGORIES_READ,
  ],
  VIEWER: [
    HOUSEHOLDS_READ,
    USERS_READ,
    ACCOUNTS_READ,
    TRANSACTIONS_READ,
    CATEGORIES_READ,
  ],
};
