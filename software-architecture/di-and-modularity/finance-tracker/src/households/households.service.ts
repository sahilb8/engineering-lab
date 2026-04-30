import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HouseholdsService {
  constructor(private prisma: PrismaService) {}

  findOne(householdId: number) {
    return this.prisma.household.findUnique({
      where: { id: householdId },
      include: { members: true, accounts: true, categories: true },
    });
  }

  update(householdId: number, data: { name?: string }) {
    return this.prisma.household.update({ where: { id: householdId }, data });
  }

  remove(householdId: number) {
    return this.prisma.household.delete({ where: { id: householdId } });
  }
}
