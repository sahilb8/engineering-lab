import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const ROLES_CREATE = 'roles:create';
export const ROLES_READ = 'roles:read';
export const ROLES_EDIT = 'roles:edit';
export const ROLES_DELETE = 'roles:delete';
export const ROLES_ASSIGN = 'roles:assign';
export const ROLES_UNASSIGN = 'roles:unassign';

export const rolesPermissions: PermissionDescriptor = {
  module: 'roles',
  permissions: [
    ROLES_CREATE,
    ROLES_READ,
    ROLES_EDIT,
    ROLES_DELETE,
    ROLES_ASSIGN,
    ROLES_UNASSIGN,
  ],
  defaultRoleTemplates: {
    Owner: [
      ROLES_CREATE,
      ROLES_READ,
      ROLES_EDIT,
      ROLES_DELETE,
      ROLES_ASSIGN,
      ROLES_UNASSIGN,
    ],
    Member: [ROLES_CREATE, ROLES_READ, ROLES_ASSIGN],
    Viewer: [ROLES_READ],
  },
  delegation: {
    [ROLES_READ]: { grantableBy: ROLES_READ },
    [ROLES_CREATE]: { grantableBy: ROLES_DELETE },
    [ROLES_EDIT]: { grantableBy: ROLES_DELETE },
    [ROLES_DELETE]: { grantableBy: ROLES_DELETE },
    [ROLES_ASSIGN]: { grantableBy: ROLES_DELETE },
    [ROLES_UNASSIGN]: { grantableBy: ROLES_DELETE },
  },
};
