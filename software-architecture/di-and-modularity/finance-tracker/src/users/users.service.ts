import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    householdId: number,
    data: {
      email: string;
      name: string;
      role?: 'OWNER' | 'MEMBER' | 'VIEWER';
    },
  ) {
    return this.prisma.user.create({ data: { ...data, householdId } });
  }

  findAll(householdId: number) {
    return this.prisma.user.findMany({ where: { householdId } });
  }

  findOne(householdId: number, id: number) {
    return this.prisma.user.findFirst({ where: { id, householdId } });
  }

  update(
    householdId: number,
    id: number,
    data: {
      email?: string;
      name?: string;
      role?: 'OWNER' | 'MEMBER' | 'VIEWER';
    },
  ) {
    return this.prisma.user.updateMany({
      where: { id, householdId },
      data,
    });
  }

  remove(householdId: number, id: number) {
    return this.prisma.user.deleteMany({ where: { id, householdId } });
  }
}
