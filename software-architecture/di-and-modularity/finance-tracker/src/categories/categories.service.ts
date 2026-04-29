import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  create(householdId: number, data: { name: string }) {
    return this.prisma.category.create({ data: { ...data, householdId } });
  }

  findAll(householdId: number) {
    return this.prisma.category.findMany({ where: { householdId } });
  }

  findOne(householdId: number, id: number) {
    return this.prisma.category.findFirst({
      where: { id, householdId },
      include: { transactions: true },
    });
  }

  update(householdId: number, id: number, data: { name?: string }) {
    return this.prisma.category.updateMany({
      where: { id, householdId },
      data,
    });
  }

  remove(householdId: number, id: number) {
    return this.prisma.category.deleteMany({ where: { id, householdId } });
  }
}
