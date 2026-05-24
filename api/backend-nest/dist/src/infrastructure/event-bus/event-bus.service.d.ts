import { DLQService } from './dlq.service';
export declare class EventBusService {
    private dlq;
    private readonly logger;
    private handlers;
    constructor(dlq: DLQService);
    on(eventName: string, handler: Function): void;
    emit(eventName: string, payload: any, context?: any): Promise<void>;
}
