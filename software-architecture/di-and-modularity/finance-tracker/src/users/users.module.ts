import { Module, OnModuleInit } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PERMISSION_DESCRIPTOR } from '../core/permissions/permission-descriptor.interface';
import { PermissionRegistryService } from '../core/permissions/permission-registry.service';
import { usersPermissions } from './users.permissions';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: PERMISSION_DESCRIPTOR,
      useValue: usersPermissions,
    },
  ],
})
export class UsersModule implements OnModuleInit {
  constructor(private readonly permissionRegistry: PermissionRegistryService) {}

  onModuleInit() {
    this.permissionRegistry.register(usersPermissions);
  }
}
