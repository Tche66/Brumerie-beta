import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DLQService {
  constructor(private prisma: PrismaService) {}

  async enqueueDeadLetter(data: {
    eventName: string;
    payload: any;
    error: string;
  }) {
    await this.prisma.deadLetterQueue.create({
      data: {
        eventName: data.eventName,
        payload: data.payload,
        error: data.error,
        retryCount: 0,
      },
    });
  }

  async getDLQItems() {
    return this.prisma.deadLetterQueue.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async replayDLQItem(dlqId: string) {
    const item = await this.prisma.deadLetterQueue.findUnique({
      where: { id: dlqId },
    });

    if (!item) return null;

    await this.prisma.deadLetterQueue.update({
      where: { id: dlqId },
      data: { retryCount: 0 },
    });

    return item;
  }
}