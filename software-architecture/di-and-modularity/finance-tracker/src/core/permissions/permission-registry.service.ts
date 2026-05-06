import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PermissionDescriptor } from './permission-descriptor.interface';

@Injectable()
export class PermissionRegistryService implements OnApplicationBootstrap {
  private descriptors: PermissionDescriptor[] = [];
  private rolePermissionsMap: Record<string, string[]> = {};

  register(descriptor: PermissionDescriptor) {
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
