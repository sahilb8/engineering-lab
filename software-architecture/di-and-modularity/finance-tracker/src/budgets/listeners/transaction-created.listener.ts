import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '../../core/events/domain-event.interface';
import { TransactionCreatedPayload } from '../../transactions/events/transaction-created.event';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TransactionCreatedListener {
  private readonly logger = new Logger(TransactionCreatedListener.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: DomainEvent) {
    const { householdId, categoryId, amount } =
      event.payload as unknown as TransactionCreatedPayload;

    if (!categoryId) {
      this.logger.log('Transaction has no category — skipping budget update');
      return;
    }

    const budget = await this.prisma.budget.findFirst({
      where: { householdId, categoryId },
    });

    if (!budget) {
      this.logger.log(
        `No budget found for household ${householdId}, category ${categoryId}`,
      );
      return;
    }

    await this.prisma.budget.update({
      where: { id: budget.id },
      data: { currentSpent: { increment: amount } },
    });

    this.logger.log(
      `Updated budget ${budget.id}: incremented currentSpent by ${amount}`,
    );
  }
}
