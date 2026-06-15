import { Module } from '@nestjs/common';
import { SeoController } from './seo.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SeoController],
  providers: [PrismaService],
})
export class SeoModule {}
