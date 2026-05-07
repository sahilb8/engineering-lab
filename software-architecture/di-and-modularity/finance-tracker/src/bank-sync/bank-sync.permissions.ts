import { PermissionDescriptor } from '../core/permissions/permission-descriptor.interface';

export const BANK_SYNC_EXECUTE = 'bank-sync:execute';
export const BANK_SYNC_READ = 'bank-sync:read';

export const bankSyncPermissions: PermissionDescriptor = {
  module: 'bank-sync',
  permissions: {
    OWNER: [BANK_SYNC_EXECUTE, BANK_SYNC_READ],
    MEMBER: [BANK_SYNC_EXECUTE, BANK_SYNC_READ],
    VIEWER: [BANK_SYNC_READ],
  },
};
