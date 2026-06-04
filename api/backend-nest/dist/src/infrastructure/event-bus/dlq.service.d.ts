import { PrismaService } from '../../prisma/prisma.service';
export declare class DLQService {
    private prisma;
    constructor(prisma: PrismaService);
    enqueueDeadLetter(data: {
        eventName: string;
        payload: any;
        error: string;
    }): Promise<void>;
    getDLQItems(): Promise<{
        error: string;
        id: string;
        createdAt: Date;
        eventName: string;
        payload: import("@prisma/client/runtime/library").JsonValue;
        retryCount: number;
        resolvedAt: Date | null;
    }[]>;
    replayDLQItem(dlqId: string): Promise<{
        error: string;
        id: string;
        createdAt: Date;
        eventName: string;
        payload: import("@prisma/client/runtime/library").JsonValue;
        retryCount: number;
        resolvedAt: Date | null;
    }>;
}
