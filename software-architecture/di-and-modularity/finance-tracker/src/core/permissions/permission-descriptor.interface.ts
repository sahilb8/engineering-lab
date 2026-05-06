export interface PermissionDescriptor {
  module: string;
  permissions: {
    OWNER: string[];
    MEMBER: string[];
    VIEWER: string[];
  };
}

export const PERMISSION_DESCRIPTOR = Symbol('PERMISSION_DESCRIPTOR');
