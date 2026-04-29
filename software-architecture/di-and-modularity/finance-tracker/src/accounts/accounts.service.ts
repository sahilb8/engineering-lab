import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  create(data: { name: string; balance?: number; householdId: number }) {
    return this.prisma.account.create({ data });
  }

  findAll() {
    return this.prisma.account.findMany();
  }

  findOne(id: number) {
    return this.prisma.account.findUnique({
      where: { id },
      include: { transactions: true },
    });
  }

  update(id: number, data: { name?: string; balance?: number }) {
    if (!data.name && data.balance === undefined) {
      return this.prisma.account.findUnique({ where: { id } });
    }
    return this.prisma.account.update({ where: { id }, data });
  }

  remove(id: number) {
    return this.prisma.account.delete({ where: { id } });
  }
}
