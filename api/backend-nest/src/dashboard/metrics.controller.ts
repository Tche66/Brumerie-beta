import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('dashboard')
export class MetricsController {
  constructor(private prisma: PrismaService) {}

  @Get('health')
  async getHealth() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [ordersToday, dlqSize, postgresHealth] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.deadLetterQueue.count(),
      this.checkPostgres(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      system: { postgres: postgresHealth },
      business: { ordersToday },
      reliability: { dlqSize },
    };
  }

  private async checkPostgres() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up' };
    } catch {
      return { status: 'down' };
    }
  }
}
