export declare class MessagingService {
    private db;
    getUserConversations(userId: string): Promise<{
        id: string;
    }[]>;
    getMessages(conversationId: string, limit?: number): Promise<{
        id: string;
    }[]>;
    sendMessage(data: {
        conversationId: string;
        content: string;
    }, senderId: string): Promise<{
        id: string;
        senderId: string;
        content: string;
        createdAt: Date;
    }>;
}
