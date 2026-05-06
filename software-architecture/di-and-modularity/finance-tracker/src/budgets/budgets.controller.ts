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
import { BudgetsService } from './budgets.service';
import { HouseholdId } from '../common/decorators/household-id.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import {
  BUDGETS_CREATE,
  BUDGETS_READ,
  BUDGETS_EDIT,
  BUDGETS_DELETE,
} from './budgets.permissions';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @Permissions(BUDGETS_CREATE)
  create(
    @HouseholdId() householdId: number,
    @Body() body: { categoryId: number; monthlyLimit: number },
  ) {
    return this.budgetsService.create(householdId, body);
  }

  @Get()
  @Permissions(BUDGETS_READ)
  findAll(@HouseholdId() householdId: number) {
    return this.budgetsService.findAll(householdId);
  }

  @Get(':id')
  @Permissions(BUDGETS_READ)
  findOne(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.budgetsService.findOne(householdId, id);
  }

  @Put(':id')
  @Permissions(BUDGETS_EDIT)
  update(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: { categoryId?: number; monthlyLimit?: number; currentSpent?: number },
  ) {
    return this.budgetsService.update(householdId, id, body);
  }

  @Delete(':id')
  @Permissions(BUDGETS_DELETE)
  remove(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.budgetsService.remove(householdId, id);
  }
}
