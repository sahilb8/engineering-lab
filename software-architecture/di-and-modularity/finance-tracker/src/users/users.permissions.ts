import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const USERS_CREATE = 'users:create';
export const USERS_READ = 'users:read';
export const USERS_EDIT = 'users:edit';
export const USERS_DELETE = 'users:delete';

export const usersPermissions: PermissionDescriptor = {
  module: 'users',
  permissions: {
    OWNER: [USERS_CREATE, USERS_READ, USERS_EDIT, USERS_DELETE],
    MEMBER: [USERS_READ],
    VIEWER: [USERS_READ],
  },
};
