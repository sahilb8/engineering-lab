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
import { TransactionsService } from './transactions.service';
import { HouseholdId } from '../common/decorators/household-id.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import {
  TRANSACTIONS_CREATE,
  TRANSACTIONS_READ,
  TRANSACTIONS_EDIT,
  TRANSACTIONS_DELETE,
} from '../common/constants/permissions.constants';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @Permissions(TRANSACTIONS_CREATE)
  create(
    @HouseholdId() householdId: number,
    @Body()
    body: {
      amount: number;
      description: string;
      date: string;
      accountId: number;
      categoryId?: number;
    },
  ) {
    return this.transactionsService.create(householdId, body);
  }

  @Get()
  @Permissions(TRANSACTIONS_READ)
  findAll(@HouseholdId() householdId: number) {
    return this.transactionsService.findAll(householdId);
  }

  @Get(':id')
  @Permissions(TRANSACTIONS_READ)
  findOne(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transactionsService.findOne(householdId, id);
  }

  @Put(':id')
  @Permissions(TRANSACTIONS_EDIT)
  update(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      amount?: number;
      description?: string;
      date?: string;
      categoryId?: number;
    },
  ) {
    return this.transactionsService.update(householdId, id, body);
  }

  @Delete(':id')
  @Permissions(TRANSACTIONS_DELETE)
  remove(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transactionsService.remove(householdId, id);
  }
}
