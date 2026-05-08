import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BudgetEntity {
  id: number;
  monthlyLimit: number;
  currentSpent: number;
  householdId: number;
  categoryId: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async create(
    householdId: number,
    data: { categoryId: number; monthlyLimit: number },
  ): Promise<BudgetEntity> {
    const budget = await this.prisma.budget.create({
      data: { ...data, householdId },
    });
    return {
      ...budget,
      monthlyLimit: budget.monthlyLimit.toNumber(),
      currentSpent: budget.currentSpent.toNumber(),
    };
  }

  async findAll(householdId: number): Promise<BudgetEntity[]> {
    const budgets = await this.prisma.budget.findMany({
      where: { householdId },
    });
    return budgets.map((b) => ({
      ...b,
      monthlyLimit: b.monthlyLimit.toNumber(),
      currentSpent: b.currentSpent.toNumber(),
    }));
  }

  async findOne(householdId: number, id: number): Promise<BudgetEntity | null> {
    const budget = await this.prisma.budget.findFirst({
      where: { id, householdId },
    });
    if (!budget) return null;
    return {
      ...budget,
      monthlyLimit: budget.monthlyLimit.toNumber(),
      currentSpent: budget.currentSpent.toNumber(),
    };
  }

  async update(
    householdId: number,
    id: number,
    data: { categoryId?: number; monthlyLimit?: number; currentSpent?: number },
  ): Promise<{ count: number }> {
    return this.prisma.budget.updateMany({
      where: { id, householdId },
      data,
    });
  }

  async remove(householdId: number, id: number): Promise<{ count: number }> {
    return this.prisma.budget.deleteMany({ where: { id, householdId } });
  }
}
