import { DLQService } from '../infrastructure/event-bus/dlq.service';
export declare class DLQDashboardController {
    private dlq;
    constructor(dlq: DLQService);
    getDLQ(): Promise<{
        error: string;
        id: string;
        createdAt: Date;
        eventName: string;
        payload: import("@prisma/client/runtime/library").JsonValue;
        retryCount: number;
        resolvedAt: Date | null;
    }[]>;
    replayDLQItem(id: string): Promise<{
        status: string;
        item: {
            error: string;
            id: string;
            createdAt: Date;
            eventName: string;
            payload: import("@prisma/client/runtime/library").JsonValue;
            retryCount: number;
            resolvedAt: Date | null;
        };
    }>;
}
