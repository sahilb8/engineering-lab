import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const BANK_SYNC_EXECUTE = 'bank-sync:execute';
export const BANK_SYNC_READ = 'bank-sync:read';

export const bankSyncPermissions: PermissionDescriptor = {
  module: 'bank-sync',
  permissions: [BANK_SYNC_EXECUTE, BANK_SYNC_READ],
  defaultRoleTemplates: {
    Owner: [BANK_SYNC_EXECUTE, BANK_SYNC_READ],
    Member: [BANK_SYNC_EXECUTE, BANK_SYNC_READ],
    Viewer: [BANK_SYNC_READ],
  },
  delegation: {
    [BANK_SYNC_EXECUTE]: { grantableBy: BANK_SYNC_EXECUTE },
    [BANK_SYNC_READ]: { grantableBy: BANK_SYNC_READ },
  },
};
