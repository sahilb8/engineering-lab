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
import { AccountsService } from './accounts.service';
import { HouseholdId } from '../common/decorators/household-id.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import {
  ACCOUNTS_CREATE,
  ACCOUNTS_READ,
  ACCOUNTS_EDIT,
  ACCOUNTS_DELETE,
} from '../common/constants/permissions.constants';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @Permissions(ACCOUNTS_CREATE)
  create(
    @HouseholdId() householdId: number,
    @Body() body: { name: string; balance?: number },
  ) {
    return this.accountsService.create(householdId, body);
  }

  @Get()
  @Permissions(ACCOUNTS_READ)
  findAll(@HouseholdId() householdId: number) {
    return this.accountsService.findAll(householdId);
  }

  @Get(':id')
  @Permissions(ACCOUNTS_READ)
  findOne(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.accountsService.findOne(householdId, id);
  }

  @Put(':id')
  @Permissions(ACCOUNTS_EDIT)
  update(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; balance?: number },
  ) {
    return this.accountsService.update(householdId, id, body);
  }

  @Delete(':id')
  @Permissions(ACCOUNTS_DELETE)
  remove(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.accountsService.remove(householdId, id);
  }
}
