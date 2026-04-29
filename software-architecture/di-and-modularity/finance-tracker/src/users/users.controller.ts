import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Headers,
} from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(
    @Headers('x-household-id') householdId: string,
    @Body()
    body: {
      email: string;
      name: string;
      role?: 'OWNER' | 'MEMBER' | 'VIEWER';
    },
  ) {
    return this.usersService.create(+householdId, body);
  }

  @Get()
  findAll(@Headers('x-household-id') householdId: string) {
    return this.usersService.findAll(+householdId);
  }

  @Get(':id')
  findOne(
    @Headers('x-household-id') householdId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.findOne(+householdId, id);
  }

  @Put(':id')
  update(
    @Headers('x-household-id') householdId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      email?: string;
      name?: string;
      role?: 'OWNER' | 'MEMBER' | 'VIEWER';
    },
  ) {
    return this.usersService.update(+householdId, id, body);
  }

  @Delete(':id')
  remove(
    @Headers('x-household-id') householdId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.remove(+householdId, id);
  }
}
