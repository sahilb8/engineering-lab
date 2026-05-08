export interface BankTransaction {
  externalId: string;
  amount: number;
  description: string;
  date: Date;
}

export interface BankAccountInfo {
  externalId: string;
  name: string;
  balance: number;
}

export interface IBankAdapter {
  supports(bankName: string): boolean;
  fetchAccounts(): Promise<BankAccountInfo[]>;
  fetchTransactions(
    accountId: string,
    dateRange: { from: Date; to: Date },
  ): Promise<BankTransaction[]>;
}

export const BANK_ADAPTERS = Symbol('BANK_ADAPTERS');
