import { Injectable } from '@nestjs/common';
import {
  IBankAdapter,
  BankAccountInfo,
  BankTransaction,
} from '../../core/contracts/bank-adapter.contract';

@Injectable()
export class ChaseAdapter implements IBankAdapter {
  supports(bankName: string): boolean {
    return bankName.toLowerCase() === 'chase';
  }

  async fetchAccounts(): Promise<BankAccountInfo[]> {
    return [
      {
        externalId: 'chase-chk-001',
        name: 'Chase Total Checking',
        balance: 4250.75,
      },
      {
        externalId: 'chase-sav-001',
        name: 'Chase Savings',
        balance: 12800.0,
      },
    ];
  }

  async fetchTransactions(
    accountId: string,
    dateRange: { from: Date; to: Date },
  ): Promise<BankTransaction[]> {
    return [
      {
        externalId: `chase-txn-${Date.now()}-1`,
        amount: -45.99,
        description: 'AMAZON.COM*RT5KL2 AMZN.COM/BILL WA',
        date: new Date(dateRange.from.getTime() + 86400000),
      },
      {
        externalId: `chase-txn-${Date.now()}-2`,
        amount: -12.5,
        description: 'STARBUCKS STORE #12345',
        date: new Date(dateRange.from.getTime() + 172800000),
      },
      {
        externalId: `chase-txn-${Date.now()}-3`,
        amount: 3200.0,
        description: 'DIRECT DEP ACME CORP PAYROLL',
        date: new Date(dateRange.from.getTime() + 259200000),
      },
    ];
  }
}
