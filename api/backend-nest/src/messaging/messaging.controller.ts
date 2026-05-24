import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';

@Controller('messaging')
@UseGuards(FirebaseAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('conversations')
  async getConversations(@Req() req: any) {
    return this.messagingService.getUserConversations(req.user.uid);
  }
}
