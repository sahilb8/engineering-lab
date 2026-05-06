import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const HOUSEHOLDS_CREATE = 'households:create';
export const HOUSEHOLDS_READ = 'households:read';
export const HOUSEHOLDS_EDIT = 'households:edit';
export const HOUSEHOLDS_DELETE = 'households:delete';

export const householdsPermissions: PermissionDescriptor = {
  module: 'households',
  permissions: {
    OWNER: [
      HOUSEHOLDS_CREATE,
      HOUSEHOLDS_READ,
      HOUSEHOLDS_EDIT,
      HOUSEHOLDS_DELETE,
    ],
    MEMBER: [HOUSEHOLDS_READ],
    VIEWER: [HOUSEHOLDS_READ],
  },
};
