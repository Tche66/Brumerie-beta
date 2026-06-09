import { Module } from '@nestjs/common';
import { MigrationController } from './migration.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MigrationController],
})
export class MigrationModule {}
