import { Module } from '@nestjs/common';
import { BrumeIaController } from './brume-ia.controller';
import { BrumeIaService } from './brume-ia.service';
import { AssistantService } from './assistant.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BrumeIaController],
  providers: [BrumeIaService, AssistantService],
  exports: [BrumeIaService, AssistantService],
})
export class BrumeIaModule {}
