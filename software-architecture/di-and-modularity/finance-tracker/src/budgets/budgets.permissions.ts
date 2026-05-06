import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const BUDGETS_CREATE = 'budgets:create';
export const BUDGETS_READ = 'budgets:read';
export const BUDGETS_EDIT = 'budgets:edit';
export const BUDGETS_DELETE = 'budgets:delete';

export const budgetsPermissions: PermissionDescriptor = {
  module: 'budgets',
  permissions: {
    OWNER: [BUDGETS_CREATE, BUDGETS_READ, BUDGETS_EDIT, BUDGETS_DELETE],
    MEMBER: [BUDGETS_CREATE, BUDGETS_READ, BUDGETS_EDIT],
    VIEWER: [BUDGETS_READ],
  },
};
