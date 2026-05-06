import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const TRANSACTIONS_CREATE = 'transactions:create';
export const TRANSACTIONS_READ = 'transactions:read';
export const TRANSACTIONS_EDIT = 'transactions:edit';
export const TRANSACTIONS_DELETE = 'transactions:delete';

export const transactionsPermissions: PermissionDescriptor = {
  module: 'transactions',
  permissions: {
    OWNER: [
      TRANSACTIONS_CREATE,
      TRANSACTIONS_READ,
      TRANSACTIONS_EDIT,
      TRANSACTIONS_DELETE,
    ],
    MEMBER: [TRANSACTIONS_CREATE, TRANSACTIONS_READ, TRANSACTIONS_EDIT],
    VIEWER: [TRANSACTIONS_READ],
  },
};
