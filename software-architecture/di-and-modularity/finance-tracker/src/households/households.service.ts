import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HouseholdsService {
  constructor(private prisma: PrismaService) {}

  create(data: { name: string }) {
    return this.prisma.household.create({ data });
  }

  findAll() {
    return this.prisma.household.findMany({ include: { members: true } });
  }

  findOne(id: number) {
    return this.prisma.household.findUnique({
      where: { id },
      include: { members: true, accounts: true, categories: true },
    });
  }

  update(id: number, data: { name?: string }) {
    return this.prisma.household.update({ where: { id }, data });
  }

  remove(id: number) {
    return this.prisma.household.delete({ where: { id } });
  }
}
