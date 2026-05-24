import { MessagingService } from './messaging.service';
export declare class MessagingController {
    private readonly messagingService;
    constructor(messagingService: MessagingService);
    getConversations(req: any): Promise<{
        id: string;
    }[]>;
}
