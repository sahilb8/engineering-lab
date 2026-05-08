import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  BANK_ADAPTERS,
  IBankAdapter,
} from '../core/contracts/bank-adapter.contract';

@Injectable()
export class BankAdapterRegistry {
  constructor(
    @Inject(BANK_ADAPTERS)
    private readonly adapters: IBankAdapter[],
  ) {}

  getAdapter(bankName: string): IBankAdapter {
    const adapter = this.adapters.find((a) => a.supports(bankName));
    if (!adapter) {
      throw new NotFoundException(
        `No bank adapter registered for "${bankName}". ` +
          `Available banks: ${this.getSupportedBanks().join(', ')}`,
      );
    }
    return adapter;
  }

  getSupportedBanks(): string[] {
    return this.adapters.map((a) => a.constructor.name);
  }
}
