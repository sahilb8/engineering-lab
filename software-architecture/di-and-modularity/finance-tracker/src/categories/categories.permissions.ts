import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const CATEGORIES_CREATE = 'categories:create';
export const CATEGORIES_READ = 'categories:read';
export const CATEGORIES_EDIT = 'categories:edit';
export const CATEGORIES_DELETE = 'categories:delete';

export const categoriesPermissions: PermissionDescriptor = {
  module: 'categories',
  permissions: {
    OWNER: [
      CATEGORIES_CREATE,
      CATEGORIES_READ,
      CATEGORIES_EDIT,
      CATEGORIES_DELETE,
    ],
    MEMBER: [CATEGORIES_READ],
    VIEWER: [CATEGORIES_READ],
  },
};
