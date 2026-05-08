import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IAccountsService,
  ACCOUNTS_SERVICE,
} from '../core/contracts/accounts-service.contract';
import { EventBus } from '../core/events/event-bus.service';
import { transactionCreatedEvent } from './events/transaction-created.event';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    @Inject(ACCOUNTS_SERVICE)
    private readonly accountsService: IAccountsService,
    private readonly eventBus: EventBus,
  ) {}

  async create(
    householdId: number,
    data: {
      amount: number;
      description: string;
      date: string;
      accountId: number;
      categoryId?: number;
    },
  ) {
    const account = await this.accountsService.findOne(
      householdId,
      data.accountId,
    );

    if (!account) {
      throw new NotFoundException(
        `Account ${data.accountId} not found in this household`,
      );
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        amount: data.amount,
        description: data.description,
        date: new Date(data.date),
        householdId,
        accountId: data.accountId,
        categoryId: data.categoryId,
      },
    });

    await this.eventBus.publish(
      transactionCreatedEvent({
        transactionId: transaction.id,
        householdId,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        amount: Number(transaction.amount),
      }),
    );

    return transaction;
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
