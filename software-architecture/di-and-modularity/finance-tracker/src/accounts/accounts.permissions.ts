import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const accountsPermissions: PermissionDescriptor = {
  module: 'accounts',
  permissions: {
    OWNER: [
      'accounts:create',
      'accounts:read',
      'accounts:edit',
      'accounts:delete',
    ],
    MEMBER: ['accounts:create', 'accounts:read', 'accounts:edit'],
    VIEWER: ['accounts:read'],
  },
};
