import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BankAdapterRegistry } from './bank-adapter-registry.service';

@Injectable()
export class BankSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterRegistry: BankAdapterRegistry,
  ) {}

  async syncTransactions(
    householdId: number,
    accountId: number,
    dateRange?: { from: string; to: string },
  ) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, householdId },
    });

    if (!account) {
      throw new NotFoundException(
        `Account ${accountId} not found in household ${householdId}`,
      );
    }

    if (!account.bankName) {
      throw new BadRequestException(
        `Account "${account.name}" has no bank configured. Set a bankName first.`,
      );
    }

    const adapter = this.adapterRegistry.getAdapter(account.bankName);

    const from = dateRange?.from
      ? new Date(dateRange.from)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default: last 30 days
    const to = dateRange?.to ? new Date(dateRange.to) : new Date();

    const bankTransactions = await adapter.fetchTransactions(
      String(account.id),
      { from, to },
    );

    let synced = 0;
    for (const txn of bankTransactions) {
      await this.prisma.transaction.create({
        data: {
          amount: txn.amount,
          description: txn.description,
          date: txn.date,
          accountId: account.id,
          householdId,
        },
      });
      synced++;
    }

    return {
      accountId: account.id,
      bankName: account.bankName,
      transactionsSynced: synced,
      dateRange: { from, to },
    };
  }
}
