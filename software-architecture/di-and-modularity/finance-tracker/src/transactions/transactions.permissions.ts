import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const transactionsPermissions: PermissionDescriptor = {
  module: 'transactions',
  permissions: {
    OWNER: [
      'transactions:create',
      'transactions:read',
      'transactions:edit',
      'transactions:delete',
    ],
    MEMBER: ['transactions:create', 'transactions:read', 'transactions:edit'],
    VIEWER: ['transactions:read'],
  },
};
