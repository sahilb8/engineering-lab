import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { HouseholdId } from '../common/decorators/household-id.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import {
  USERS_CREATE,
  USERS_READ,
  USERS_EDIT,
  USERS_DELETE,
} from '../common/constants/permissions.constants';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions(USERS_CREATE)
  create(
    @HouseholdId() householdId: number,
    @Body()
    body: {
      email: string;
      name: string;
      role?: 'OWNER' | 'MEMBER' | 'VIEWER';
    },
  ) {
    return this.usersService.create(householdId, body);
  }

  @Get()
  @Permissions(USERS_READ)
  findAll(@HouseholdId() householdId: number) {
    return this.usersService.findAll(householdId);
  }

  @Get(':id')
  @Permissions(USERS_READ)
  findOne(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.findOne(householdId, id);
  }

  @Put(':id')
  @Permissions(USERS_EDIT)
  update(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      email?: string;
      name?: string;
      role?: 'OWNER' | 'MEMBER' | 'VIEWER';
    },
  ) {
    return this.usersService.update(householdId, id, body);
  }

  @Delete(':id')
  @Permissions(USERS_DELETE)
  remove(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.remove(householdId, id);
  }
}
