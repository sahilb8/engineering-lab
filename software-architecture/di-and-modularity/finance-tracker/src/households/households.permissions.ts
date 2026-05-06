import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const householdsPermissions: PermissionDescriptor = {
  module: 'households',
  permissions: {
    OWNER: [
      'households:create',
      'households:read',
      'households:edit',
      'households:delete',
    ],
    MEMBER: ['households:read'],
    VIEWER: ['households:read'],
  },
};
