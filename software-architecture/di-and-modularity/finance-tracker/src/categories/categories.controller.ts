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
import { Permissions } from '../common/decorators/permissions.decorator';
import {
  CATEGORIES_CREATE,
  CATEGORIES_READ,
  CATEGORIES_EDIT,
  CATEGORIES_DELETE,
} from '../common/constants/permissions.constants';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Permissions(CATEGORIES_CREATE)
  create(@HouseholdId() householdId: number, @Body() body: { name: string }) {
    return this.categoriesService.create(householdId, body);
  }

  @Get()
  @Permissions(CATEGORIES_READ)
  findAll(@HouseholdId() householdId: number) {
    return this.categoriesService.findAll(householdId);
  }

  @Get(':id')
  @Permissions(CATEGORIES_READ)
  findOne(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.categoriesService.findOne(householdId, id);
  }

  @Put(':id')
  @Permissions(CATEGORIES_EDIT)
  update(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string },
  ) {
    return this.categoriesService.update(householdId, id, body);
  }

  @Delete(':id')
  @Permissions(CATEGORIES_DELETE)
  remove(
    @HouseholdId() householdId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.categoriesService.remove(householdId, id);
  }
}
