import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const categoriesPermissions: PermissionDescriptor = {
  module: 'categories',
  permissions: {
    OWNER: [
      'categories:create',
      'categories:read',
      'categories:edit',
      'categories:delete',
    ],
    MEMBER: ['categories:read'],
    VIEWER: ['categories:read'],
  },
};
