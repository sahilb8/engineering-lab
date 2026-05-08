import { Injectable } from '@nestjs/common';
import {
  IBankAdapter,
  BankAccountInfo,
  BankTransaction,
} from '../../core/contracts/bank-adapter.contract';

@Injectable()
export class WellsFargoAdapter implements IBankAdapter {
  supports(bankName: string): boolean {
    return bankName.toLowerCase() === 'wells_fargo';
  }

  async fetchAccounts(): Promise<BankAccountInfo[]> {
    return [
      {
        externalId: 'wf-chk-001',
        name: 'Wells Fargo Everyday Checking',
        balance: 2890.33,
      },
      {
        externalId: 'wf-sav-001',
        name: 'Wells Fargo Way2Save',
        balance: 8450.0,
      },
    ];
  }

  async fetchTransactions(
    accountId: string,
    dateRange: { from: Date; to: Date },
  ): Promise<BankTransaction[]> {
    return [
      {
        externalId: `wf-txn-${Date.now()}-1`,
        amount: -89.99,
        description: 'POS PURCHASE COSTCO WHSE #1234',
        date: new Date(dateRange.from.getTime() + 86400000),
      },
      {
        externalId: `wf-txn-${Date.now()}-2`,
        amount: -155.0,
        description: 'ONLINE PAYMENT PG&E ELECTRIC',
        date: new Date(dateRange.from.getTime() + 172800000),
      },
      {
        externalId: `wf-txn-${Date.now()}-3`,
        amount: 2750.0,
        description: 'ACH DEPOSIT GLOBEX CORP SALARY',
        date: new Date(dateRange.from.getTime() + 259200000),
      },
    ];
  }
}
