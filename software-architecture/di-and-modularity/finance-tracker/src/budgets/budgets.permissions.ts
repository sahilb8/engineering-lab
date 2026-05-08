import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const BUDGETS_CREATE = 'budgets:create';
export const BUDGETS_READ = 'budgets:read';
export const BUDGETS_EDIT = 'budgets:edit';
export const BUDGETS_DELETE = 'budgets:delete';

export const budgetsPermissions: PermissionDescriptor = {
  module: 'budgets',
  permissions: [BUDGETS_CREATE, BUDGETS_READ, BUDGETS_EDIT, BUDGETS_DELETE],
  defaultRoleTemplates: {
    Owner: [BUDGETS_CREATE, BUDGETS_READ, BUDGETS_EDIT, BUDGETS_DELETE],
    Member: [BUDGETS_CREATE, BUDGETS_READ, BUDGETS_EDIT],
    Viewer: [BUDGETS_READ],
  },
  delegation: {
    [BUDGETS_READ]: { grantableBy: BUDGETS_READ },
    [BUDGETS_CREATE]: { grantableBy: BUDGETS_DELETE },
    [BUDGETS_EDIT]: { grantableBy: BUDGETS_DELETE },
    [BUDGETS_DELETE]: { grantableBy: BUDGETS_DELETE },
  },
};
