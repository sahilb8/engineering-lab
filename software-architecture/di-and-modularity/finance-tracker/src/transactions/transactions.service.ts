import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  create(data: {
    amount: number;
    description: string;
    date: string;
    accountId: number;
    categoryId?: number;
  }) {
    return this.prisma.transaction.create({
      data: { ...data, date: new Date(data.date) },
    });
  }

  findAll() {
    return this.prisma.transaction.findMany({
      include: { account: true, category: true },
    });
  }

  findOne(id: number) {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: { account: true, category: true },
    });
  }

  update(
    id: number,
    data: {
      amount?: number;
      description?: string;
      date?: string;
      categoryId?: number;
    },
  ) {
    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
  }

  remove(id: number) {
    return this.prisma.transaction.delete({ where: { id } });
  }
}
