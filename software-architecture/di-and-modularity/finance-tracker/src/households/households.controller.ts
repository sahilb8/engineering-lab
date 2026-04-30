import { Controller, Get, Put, Delete, Body } from '@nestjs/common';
import { HouseholdsService } from './households.service';
import { HouseholdId } from '../common/decorators/household-id.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import {
  HOUSEHOLDS_READ,
  HOUSEHOLDS_EDIT,
  HOUSEHOLDS_DELETE,
} from '../common/constants/permissions.constants';

@Controller('households')
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Get()
  @Permissions(HOUSEHOLDS_READ)
  findOne(@HouseholdId() householdId: number) {
    return this.householdsService.findOne(householdId);
  }

  @Put()
  @Permissions(HOUSEHOLDS_EDIT)
  update(@HouseholdId() householdId: number, @Body() body: { name?: string }) {
    return this.householdsService.update(householdId, body);
  }

  @Delete()
  @Permissions(HOUSEHOLDS_DELETE)
  remove(@HouseholdId() householdId: number) {
    return this.householdsService.remove(householdId);
  }
}
