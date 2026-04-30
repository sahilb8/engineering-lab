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

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
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
  findAll(@HouseholdId() householdId: number) {
    return this.transactionsService.findAll(householdId);
  }

  @Get(':id')
  findOne(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transactionsService.findOne(householdId, id);
  }

  @Put(':id')
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
  remove(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transactionsService.remove(householdId, id);
  }
}
