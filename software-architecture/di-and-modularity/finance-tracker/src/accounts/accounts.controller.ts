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

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(
    @HouseholdId() householdId: number,
    @Body() body: { name: string; balance?: number },
  ) {
    return this.accountsService.create(householdId, body);
  }

  @Get()
  findAll(@HouseholdId() householdId: number) {
    return this.accountsService.findAll(householdId);
  }

  @Get(':id')
  findOne(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.accountsService.findOne(householdId, id);
  }

  @Put(':id')
  update(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; balance?: number },
  ) {
    return this.accountsService.update(householdId, id, body);
  }

  @Delete(':id')
  remove(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.accountsService.remove(householdId, id);
  }
}
