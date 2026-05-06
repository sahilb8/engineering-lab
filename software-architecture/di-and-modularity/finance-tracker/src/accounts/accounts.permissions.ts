import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const ACCOUNTS_CREATE = 'accounts:create';
export const ACCOUNTS_READ = 'accounts:read';
export const ACCOUNTS_EDIT = 'accounts:edit';
export const ACCOUNTS_DELETE = 'accounts:delete';

export const accountsPermissions: PermissionDescriptor = {
  module: 'accounts',
  permissions: {
    OWNER: [ACCOUNTS_CREATE, ACCOUNTS_READ, ACCOUNTS_EDIT, ACCOUNTS_DELETE],
    MEMBER: [ACCOUNTS_CREATE, ACCOUNTS_READ, ACCOUNTS_EDIT],
    VIEWER: [ACCOUNTS_READ],
  },
};
