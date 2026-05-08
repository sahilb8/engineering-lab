import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const ACCOUNTS_CREATE = 'accounts:create';
export const ACCOUNTS_READ = 'accounts:read';
export const ACCOUNTS_EDIT = 'accounts:edit';
export const ACCOUNTS_DELETE = 'accounts:delete';

export const accountsPermissions: PermissionDescriptor = {
  module: 'accounts',
  permissions: [ACCOUNTS_CREATE, ACCOUNTS_READ, ACCOUNTS_EDIT, ACCOUNTS_DELETE],
  defaultRoleTemplates: {
    Owner: [ACCOUNTS_CREATE, ACCOUNTS_READ, ACCOUNTS_EDIT, ACCOUNTS_DELETE],
    Member: [ACCOUNTS_CREATE, ACCOUNTS_READ, ACCOUNTS_EDIT],
    Viewer: [ACCOUNTS_READ],
  },
  delegation: {
    [ACCOUNTS_READ]: { grantableBy: ACCOUNTS_READ },
    [ACCOUNTS_CREATE]: { grantableBy: ACCOUNTS_DELETE },
    [ACCOUNTS_EDIT]: { grantableBy: ACCOUNTS_DELETE },
    [ACCOUNTS_DELETE]: { grantableBy: ACCOUNTS_DELETE },
  },
};
