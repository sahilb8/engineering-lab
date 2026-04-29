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
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(
    @Headers('x-household-id') householdId: string,
    @Body()
    body: {
      amount: number;
      description: string;
      date: string;
      accountId: number;
      categoryId?: number;
    },
  ) {
    return this.transactionsService.create(+householdId, body);
  }

  @Get()
  findAll(@Headers('x-household-id') householdId: string) {
    return this.transactionsService.findAll(+householdId);
  }

  @Get(':id')
  findOne(
    @Headers('x-household-id') householdId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transactionsService.findOne(+householdId, id);
  }

  @Put(':id')
  update(
    @Headers('x-household-id') householdId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      amount?: number;
      description?: string;
      date?: string;
      categoryId?: number;
    },
  ) {
    return this.transactionsService.update(+householdId, id, body);
  }

  @Delete(':id')
  remove(
    @Headers('x-household-id') householdId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transactionsService.remove(+householdId, id);
  }
}
