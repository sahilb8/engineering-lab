import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { HouseholdId } from '../common/decorators/household-id.decorator';
import { UserId } from '../common/decorators/user-id.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import {
  ROLES_CREATE,
  ROLES_READ,
  ROLES_EDIT,
  ROLES_DELETE,
  ROLES_ASSIGN,
  ROLES_UNASSIGN,
} from './roles.permissions';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Permissions(ROLES_CREATE)
  create(
    @HouseholdId() householdId: number,
    @UserId() actorUserId: number,
    @Body() body: { name: string; permissions: string[] },
  ) {
    return this.rolesService.create(householdId, actorUserId, body);
  }

  @Get()
  @Permissions(ROLES_READ)
  findAll(@HouseholdId() householdId: number) {
    return this.rolesService.findAll(householdId);
  }

  @Get(':id')
  @Permissions(ROLES_READ)
  findOne(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.rolesService.findOne(householdId, id);
  }

  @Patch(':id')
  @Permissions(ROLES_EDIT)
  update(
    @HouseholdId() householdId: number,
    @UserId() actorUserId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; permissions?: string[] },
  ) {
    return this.rolesService.update(householdId, id, actorUserId, body);
  }

  @Delete(':id')
  @Permissions(ROLES_DELETE)
  remove(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.rolesService.remove(householdId, id);
  }

  @Post(':id/assign/:userId')
  @Permissions(ROLES_ASSIGN)
  assign(
    @HouseholdId() householdId: number,
    @UserId() actorUserId: number,
    @Param('id', ParseIntPipe) roleId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.rolesService.assignRole(
      householdId,
      roleId,
      userId,
      actorUserId,
    );
  }

  @Delete(':id/assign/:userId')
  @Permissions(ROLES_UNASSIGN)
  unassign(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) roleId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.rolesService.unassignRole(householdId, roleId, userId);
  }
}
