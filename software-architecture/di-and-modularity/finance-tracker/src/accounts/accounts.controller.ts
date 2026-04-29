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
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(
    @Headers('x-household-id') householdId: string,
    @Body() body: { name: string; balance?: number },
  ) {
    return this.accountsService.create(+householdId, body);
  }

  @Get()
  findAll(@Headers('x-household-id') householdId: string) {
    return this.accountsService.findAll(+householdId);
  }

  @Get(':id')
  findOne(
    @Headers('x-household-id') householdId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.accountsService.findOne(+householdId, id);
  }

  @Put(':id')
  update(
    @Headers('x-household-id') householdId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; balance?: number },
  ) {
    return this.accountsService.update(+householdId, id, body);
  }

  @Delete(':id')
  remove(
    @Headers('x-household-id') householdId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.accountsService.remove(+householdId, id);
  }
}
