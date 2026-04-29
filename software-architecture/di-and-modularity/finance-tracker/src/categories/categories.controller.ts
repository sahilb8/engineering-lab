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
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(
    @Headers('x-household-id') householdId: string,
    @Body() body: { name: string },
  ) {
    return this.categoriesService.create(+householdId, body);
  }

  @Get()
  findAll(@Headers('x-household-id') householdId: string) {
    return this.categoriesService.findAll(+householdId);
  }

  @Get(':id')
  findOne(
    @Headers('x-household-id') householdId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.categoriesService.findOne(+householdId, id);
  }

  @Put(':id')
  update(
    @Headers('x-household-id') householdId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string },
  ) {
    return this.categoriesService.update(+householdId, id, body);
  }

  @Delete(':id')
  remove(
    @Headers('x-household-id') householdId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.categoriesService.remove(+householdId, id);
  }
}
