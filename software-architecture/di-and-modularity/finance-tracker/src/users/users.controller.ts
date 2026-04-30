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

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
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
  findAll(@HouseholdId() householdId: number) {
    return this.usersService.findAll(householdId);
  }

  @Get(':id')
  findOne(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.findOne(householdId, id);
  }

  @Put(':id')
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
  remove(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.remove(householdId, id);
  }
}
