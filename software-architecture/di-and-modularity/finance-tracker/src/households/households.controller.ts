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
import { HouseholdsService } from './households.service';
import { Permissions } from '../common/decorators/permissions.decorator';
import {
  HOUSEHOLDS_CREATE,
  HOUSEHOLDS_READ,
  HOUSEHOLDS_EDIT,
  HOUSEHOLDS_DELETE,
} from '../common/constants/permissions.constants';

@Controller('households')
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Post()
  @Permissions(HOUSEHOLDS_CREATE)
  create(@Body() body: { name: string }) {
    return this.householdsService.create(body);
  }

  @Get()
  @Permissions(HOUSEHOLDS_READ)
  findAll() {
    return this.householdsService.findAll();
  }

  @Get(':id')
  @Permissions(HOUSEHOLDS_READ)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.householdsService.findOne(id);
  }

  @Put(':id')
  @Permissions(HOUSEHOLDS_EDIT)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string },
  ) {
    return this.householdsService.update(id, body);
  }

  @Delete(':id')
  @Permissions(HOUSEHOLDS_DELETE)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.householdsService.remove(id);
  }
}
