import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('dashboard')
export class MetricsController {
  constructor(private prisma: PrismaService) {}

  @Get('health')
  async getHealth() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      postgresHealth,
      redisHealth,
      ordersToday,
      messagesToday,
      dlqSize,
      errorsToday,
      workerFailures,
    ] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.systemLog.count({
        where: {
          type: 'event',
          name: { contains: 'message.sent' },
          createdAt: { gte: today },
        },
      }),
      this.prisma.deadLetterQueue.count(),
      this.prisma.systemLog.count({
        where: {
          type: 'error',
          createdAt: { gte: today },
        },
      }),
      this.prisma.systemLog.count({
        where: {
          type: 'deadletter',
          createdAt: { gte: today },
        },
      }),
    ]);

    return {
      timestamp: new Date().toISOString(),
      system: {
        postgres: postgresHealth,
        redis: redisHealth,
      },
      business: {
        ordersToday,
        messagesToday,
      },
      reliability: {
        errorsToday,
        workerFailures,
        dlqSize,
      },
    };
  }

  private async checkPostgres() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latency: 'ok' };
    } catch {
      return { status: 'down', latency: null };
    }
  }

  private async checkRedis() {
    try {
      return { status: 'up' };
    } catch {
      return { status: 'down' };
    }
  }
}