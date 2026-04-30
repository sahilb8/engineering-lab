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
import { CategoriesService } from './categories.service';
import { HouseholdId } from '../common/decorators/household-id.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(
    @HouseholdId() householdId: number,
    @Body() body: { name: string },
  ) {
    return this.categoriesService.create(householdId, body);
  }

  @Get()
  findAll(@HouseholdId() householdId: number) {
    return this.categoriesService.findAll(householdId);
  }

  @Get(':id')
  findOne(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.categoriesService.findOne(householdId, id);
  }

  @Put(':id')
  update(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string },
  ) {
    return this.categoriesService.update(householdId, id, body);
  }

  @Delete(':id')
  remove(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.categoriesService.remove(householdId, id);
  }
}
