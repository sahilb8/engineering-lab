import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PermissionDescriptor } from './permission-descriptor.interface';

@Injectable()
export class PermissionRegistryService implements OnApplicationBootstrap {
  private descriptors: PermissionDescriptor[] = [];
  private rolePermissionsMap: Record<string, string[]> = {};
  private allRegisteredKeys = new Set<string>();
  private registeredModules = new Set<string>();

  register(descriptor: PermissionDescriptor) {
    if (this.registeredModules.has(descriptor.module)) {
      throw new Error(
        `Duplicate module name "${descriptor.module}" — each module must register a unique name`,
      );
    }
    this.registeredModules.add(descriptor.module);

    const moduleKeys = new Set(Object.values(descriptor.permissions).flat());

    for (const key of moduleKeys) {
      if (this.allRegisteredKeys.has(key)) {
        throw new Error(
          `Duplicate permission "${key}" registered by module "${descriptor.module}"`,
        );
      }
      this.allRegisteredKeys.add(key);
    }

    this.descriptors.push(descriptor);
  }

  onApplicationBootstrap() {
    this.buildMap();
  }

  private buildMap() {
    this.rolePermissionsMap = {};
    for (const descriptor of this.descriptors) {
      for (const [role, permissions] of Object.entries(
        descriptor.permissions,
      )) {
        if (!this.rolePermissionsMap[role]) {
          this.rolePermissionsMap[role] = [];
        }
        this.rolePermissionsMap[role].push(...permissions);
      }
    }
  }

  getPermissionsForRole(role: string): string[] {
    return this.rolePermissionsMap[role] ?? [];
  }

  getAllPermissions(): string[] {
    return this.descriptors.flatMap((d) => Object.values(d.permissions).flat());
  }

  getPermissionsForModule(module: string): PermissionDescriptor | undefined {
    return this.descriptors.find((d) => d.module === module);
  }
}
