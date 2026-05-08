export interface DelegationRule {
  grantableBy: string;
}

export interface PermissionDescriptor {
  module: string;
  permissions: string[];
  // Not used at runtime. Serves as a template for seeding default CustomRole
  // rows when a new household is created. The actual role-to-permission mapping
  // lives in the CustomRole table in the DB — this field just declares what
  // the default "Owner", "Member", and "Viewer" roles should contain per module.
  // A dynamic seed script could import all descriptors and build default roles
  // from these templates automatically (see prisma/seed.ts).
  defaultRoleTemplates: {
    Owner: string[];
    Member: string[];
    Viewer: string[];
  };
  delegation: Record<string, DelegationRule>;
}

export const PERMISSION_DESCRIPTOR = Symbol('PERMISSION_DESCRIPTOR');
