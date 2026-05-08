import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const TRANSACTIONS_CREATE = 'transactions:create';
export const TRANSACTIONS_READ = 'transactions:read';
export const TRANSACTIONS_EDIT = 'transactions:edit';
export const TRANSACTIONS_DELETE = 'transactions:delete';

export const transactionsPermissions: PermissionDescriptor = {
  module: 'transactions',
  permissions: [
    TRANSACTIONS_CREATE,
    TRANSACTIONS_READ,
    TRANSACTIONS_EDIT,
    TRANSACTIONS_DELETE,
  ],
  defaultRoleTemplates: {
    Owner: [
      TRANSACTIONS_CREATE,
      TRANSACTIONS_READ,
      TRANSACTIONS_EDIT,
      TRANSACTIONS_DELETE,
    ],
    Member: [TRANSACTIONS_CREATE, TRANSACTIONS_READ, TRANSACTIONS_EDIT],
    Viewer: [TRANSACTIONS_READ],
  },
  delegation: {
    [TRANSACTIONS_READ]: { grantableBy: TRANSACTIONS_READ },
    [TRANSACTIONS_CREATE]: { grantableBy: TRANSACTIONS_DELETE },
    [TRANSACTIONS_EDIT]: { grantableBy: TRANSACTIONS_DELETE },
    [TRANSACTIONS_DELETE]: { grantableBy: TRANSACTIONS_DELETE },
  },
};
