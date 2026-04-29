import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  create(householdId: number, data: { name: string; balance?: number }) {
    return this.prisma.account.create({ data: { ...data, householdId } });
  }

  findAll(householdId: number) {
    return this.prisma.account.findMany({ where: { householdId } });
  }

  findOne(householdId: number, id: number) {
    return this.prisma.account.findFirst({
      where: { id, householdId },
      include: { transactions: true },
    });
  }

  update(
    householdId: number,
    id: number,
    data: { name?: string; balance?: number },
  ) {
    return this.prisma.account.updateMany({
      where: { id, householdId },
      data,
    });
  }

  remove(householdId: number, id: number) {
    return this.prisma.account.deleteMany({ where: { id, householdId } });
  }
}
