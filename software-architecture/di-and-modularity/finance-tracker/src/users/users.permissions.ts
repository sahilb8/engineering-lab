import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const USERS_CREATE = 'users:create';
export const USERS_READ = 'users:read';
export const USERS_EDIT = 'users:edit';
export const USERS_DELETE = 'users:delete';

export const usersPermissions: PermissionDescriptor = {
  module: 'users',
  permissions: [USERS_CREATE, USERS_READ, USERS_EDIT, USERS_DELETE],
  defaultRoleTemplates: {
    Owner: [USERS_CREATE, USERS_READ, USERS_EDIT, USERS_DELETE],
    Member: [USERS_READ],
    Viewer: [USERS_READ],
  },
  delegation: {
    [USERS_READ]: { grantableBy: USERS_READ },
    [USERS_CREATE]: { grantableBy: USERS_DELETE },
    [USERS_EDIT]: { grantableBy: USERS_DELETE },
    [USERS_DELETE]: { grantableBy: USERS_DELETE },
  },
};
