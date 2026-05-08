import { Injectable } from '@nestjs/common';
import {
  PermissionDescriptor,
  DelegationRule,
} from './permission-descriptor.interface';

@Injectable()
export class PermissionRegistryService {
  private descriptors: PermissionDescriptor[] = [];
  private allRegisteredKeys = new Set<string>();
  private registeredModules = new Set<string>();
  private delegationMap: Record<string, DelegationRule> = {};

  register(descriptor: PermissionDescriptor) {
    if (this.registeredModules.has(descriptor.module)) {
      throw new Error(
        `Duplicate module name "${descriptor.module}" — each module must register a unique name`,
      );
    }
    this.registeredModules.add(descriptor.module);

    for (const key of descriptor.permissions) {
      if (this.allRegisteredKeys.has(key)) {
        throw new Error(
          `Duplicate permission "${key}" registered by module "${descriptor.module}"`,
        );
      }
      this.allRegisteredKeys.add(key);
    }

    Object.assign(this.delegationMap, descriptor.delegation);

    this.descriptors.push(descriptor);
  }

  getAllPermissions(): string[] {
    return Array.from(this.allRegisteredKeys);
  }

  getPermissionsForModule(module: string): PermissionDescriptor | undefined {
    return this.descriptors.find((d) => d.module === module);
  }

  isKnownPermission(permission: string): boolean {
    return this.allRegisteredKeys.has(permission);
  }

  canDelegate(actorPermissions: string[], permissionToGrant: string): boolean {
    const rule = this.delegationMap[permissionToGrant];
    if (!rule) return false;
    return actorPermissions.includes(rule.grantableBy);
  }

  canDelegateAll(
    actorPermissions: string[],
    permissionsToGrant: string[],
  ): { allowed: boolean; denied: string[] } {
    const denied = permissionsToGrant.filter(
      (p) => !this.canDelegate(actorPermissions, p),
    );
    return { allowed: denied.length === 0, denied };
  }
}
