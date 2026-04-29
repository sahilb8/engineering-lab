import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  create(
    householdId: number,
    data: {
      amount: number;
      description: string;
      date: string;
      accountId: number;
      categoryId?: number;
    },
  ) {
    return this.prisma.transaction.create({
      data: {
        amount: data.amount,
        description: data.description,
        date: new Date(data.date),
        householdId,
        accountId: data.accountId,
        categoryId: data.categoryId,
      },
    });
  }

  findAll(householdId: number) {
    return this.prisma.transaction.findMany({
      where: { householdId },
      include: { account: true, category: true },
    });
  }

  findOne(householdId: number, id: number) {
    return this.prisma.transaction.findFirst({
      where: { id, householdId },
      include: { account: true, category: true },
    });
  }

  update(
    householdId: number,
    id: number,
    data: {
      amount?: number;
      description?: string;
      date?: string;
      categoryId?: number;
    },
  ) {
    return this.prisma.transaction.updateMany({
      where: { id, householdId },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
  }

  remove(householdId: number, id: number) {
    return this.prisma.transaction.deleteMany({
      where: { id, householdId },
    });
  }
}
