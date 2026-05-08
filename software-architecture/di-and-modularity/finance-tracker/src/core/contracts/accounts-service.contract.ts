export interface AccountEntity {
  id: number;
  name: string;
  bankName: string | null;
  balance: number;
  householdId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionEntity {
  id: number;
  amount: number;
  description: string;
  date: Date;
  categoryId: number | null;
  accountId: number;
  householdId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountWithTransactions extends AccountEntity {
  transactions: TransactionEntity[];
}

export interface IAccountsService {
  create(
    householdId: number,
    data: { name: string; balance?: number },
  ): Promise<AccountEntity>;

  findAll(householdId: number): Promise<AccountEntity[]>;

  findOne(
    householdId: number,
    id: number,
  ): Promise<AccountWithTransactions | null>;

  update(
    householdId: number,
    id: number,
    data: { name?: string; balance?: number },
  ): Promise<{ count: number }>;

  remove(householdId: number, id: number): Promise<{ count: number }>;
}

export const ACCOUNTS_SERVICE = Symbol('ACCOUNTS_SERVICE');
