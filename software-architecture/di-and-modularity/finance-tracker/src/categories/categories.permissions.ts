import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const CATEGORIES_CREATE = 'categories:create';
export const CATEGORIES_READ = 'categories:read';
export const CATEGORIES_EDIT = 'categories:edit';
export const CATEGORIES_DELETE = 'categories:delete';

export const categoriesPermissions: PermissionDescriptor = {
  module: 'categories',
  permissions: [
    CATEGORIES_CREATE,
    CATEGORIES_READ,
    CATEGORIES_EDIT,
    CATEGORIES_DELETE,
  ],
  defaultRoleTemplates: {
    Owner: [
      CATEGORIES_CREATE,
      CATEGORIES_READ,
      CATEGORIES_EDIT,
      CATEGORIES_DELETE,
    ],
    Member: [CATEGORIES_READ],
    Viewer: [CATEGORIES_READ],
  },
  delegation: {
    [CATEGORIES_READ]: { grantableBy: CATEGORIES_READ },
    [CATEGORIES_CREATE]: { grantableBy: CATEGORIES_DELETE },
    [CATEGORIES_EDIT]: { grantableBy: CATEGORIES_DELETE },
    [CATEGORIES_DELETE]: { grantableBy: CATEGORIES_DELETE },
  },
};
