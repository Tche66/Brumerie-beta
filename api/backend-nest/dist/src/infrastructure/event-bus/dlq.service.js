"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DLQService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let DLQService = class DLQService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async enqueueDeadLetter(data) {
        await this.prisma.deadLetterQueue.create({
            data: {
                eventName: data.eventName,
                payload: data.payload,
                error: data.error,
                retryCount: 0,
            },
        });
    }
    async getDLQItems() {
        return this.prisma.deadLetterQueue.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
    async replayDLQItem(dlqId) {
        const item = await this.prisma.deadLetterQueue.findUnique({
            where: { id: dlqId },
        });
        if (!item)
            return null;
        await this.prisma.deadLetterQueue.update({
            where: { id: dlqId },
            data: { retryCount: 0 },
        });
        return item;
    }
};
exports.DLQService = DLQService;
exports.DLQService = DLQService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DLQService);
//# sourceMappingURL=dlq.service.js.map