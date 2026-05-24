import { PrismaService } from '../prisma/prisma.service';
export declare class MetricsController {
    private prisma;
    constructor(prisma: PrismaService);
    getHealth(): Promise<{
        timestamp: string;
        system: {
            postgres: {
                status: string;
            };
        };
        business: {
            ordersToday: number;
        };
        reliability: {
            dlqSize: number;
        };
    }>;
    private checkPostgres;
}
