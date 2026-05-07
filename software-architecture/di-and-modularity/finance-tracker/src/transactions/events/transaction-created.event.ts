import { DomainEvent } from '../../core/events/domain-event.interface';

export const TRANSACTION_CREATED = 'TransactionCreated';

export interface TransactionCreatedPayload {
  transactionId: number;
  householdId: number;
  accountId: number;
  categoryId: number | null;
  amount: number;
}

export function transactionCreatedEvent(
  payload: TransactionCreatedPayload,
): DomainEvent {
  return { name: TRANSACTION_CREATED, payload: { ...payload } };
}
