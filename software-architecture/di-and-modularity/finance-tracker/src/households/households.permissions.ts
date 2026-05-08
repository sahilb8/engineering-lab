import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const HOUSEHOLDS_CREATE = 'households:create';
export const HOUSEHOLDS_READ = 'households:read';
export const HOUSEHOLDS_EDIT = 'households:edit';
export const HOUSEHOLDS_DELETE = 'households:delete';

export const householdsPermissions: PermissionDescriptor = {
  module: 'households',
  permissions: [
    HOUSEHOLDS_CREATE,
    HOUSEHOLDS_READ,
    HOUSEHOLDS_EDIT,
    HOUSEHOLDS_DELETE,
  ],
  defaultRoleTemplates: {
    Owner: [
      HOUSEHOLDS_CREATE,
      HOUSEHOLDS_READ,
      HOUSEHOLDS_EDIT,
      HOUSEHOLDS_DELETE,
    ],
    Member: [HOUSEHOLDS_READ],
    Viewer: [HOUSEHOLDS_READ],
  },
  delegation: {
    [HOUSEHOLDS_READ]: { grantableBy: HOUSEHOLDS_READ },
    [HOUSEHOLDS_CREATE]: { grantableBy: HOUSEHOLDS_DELETE },
    [HOUSEHOLDS_EDIT]: { grantableBy: HOUSEHOLDS_DELETE },
    [HOUSEHOLDS_DELETE]: { grantableBy: HOUSEHOLDS_DELETE },
  },
};
