import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IAccountsService,
  AccountEntity,
  AccountWithTransactions,
} from '../core/contracts/accounts-service.contract';

@Injectable()
export class AccountsService implements IAccountsService {
  constructor(private prisma: PrismaService) {}

  async create(
    householdId: number,
    data: { name: string; balance?: number },
  ): Promise<AccountEntity> {
    const account = await this.prisma.account.create({
      data: { ...data, householdId },
    });
    return { ...account, balance: account.balance.toNumber() };
  }

  async findAll(householdId: number): Promise<AccountEntity[]> {
    const accounts = await this.prisma.account.findMany({
      where: { householdId },
    });
    return accounts.map((a) => ({ ...a, balance: a.balance.toNumber() }));
  }

  async findOne(
    householdId: number,
    id: number,
  ): Promise<AccountWithTransactions | null> {
    const account = await this.prisma.account.findFirst({
      where: { id, householdId },
      include: { transactions: true },
    });
    if (!account) return null;
    return {
      ...account,
      balance: account.balance.toNumber(),
      transactions: account.transactions.map((t) => ({
        ...t,
        amount: t.amount.toNumber(),
      })),
    };
  }

  async update(
    householdId: number,
    id: number,
    data: { name?: string; balance?: number },
  ): Promise<{ count: number }> {
    return this.prisma.account.updateMany({
      where: { id, householdId },
      data,
    });
  }

  async remove(householdId: number, id: number): Promise<{ count: number }> {
    return this.prisma.account.deleteMany({ where: { id, householdId } });
  }
}
