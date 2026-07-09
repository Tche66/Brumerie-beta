import { Module, forwardRef } from '@nestjs/common';
import { EscrowController } from './escrow.controller';
import { EscrowService } from './escrow.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AffiliateModule } from '../affiliate/affiliate.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AffiliateModule)],
  controllers: [EscrowController],
  providers: [EscrowService],
  exports: [EscrowService],
})
export class EscrowModule {}
