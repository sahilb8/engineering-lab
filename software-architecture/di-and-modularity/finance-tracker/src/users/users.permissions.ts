import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const usersPermissions: PermissionDescriptor = {
  module: 'users',
  permissions: {
    OWNER: ['users:create', 'users:read', 'users:edit', 'users:delete'],
    MEMBER: ['users:read'],
    VIEWER: ['users:read'],
  },
};
