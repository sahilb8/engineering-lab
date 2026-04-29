import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    email: string;
    name: string;
    role?: 'OWNER' | 'MEMBER' | 'VIEWER';
    householdId: number;
  }) {
    return this.prisma.user.create({ data });
  }

  findAll() {
    return this.prisma.user.findMany();
  }

  findOne(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  update(
    id: number,
    data: {
      email?: string;
      name?: string;
      role?: 'OWNER' | 'MEMBER' | 'VIEWER';
    },
  ) {
    return this.prisma.user.update({ where: { id }, data });
  }

  remove(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }
}
