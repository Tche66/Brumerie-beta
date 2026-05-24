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
var EventBusService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBusService = void 0;
const common_1 = require("@nestjs/common");
const dlq_service_1 = require("./dlq.service");
let EventBusService = EventBusService_1 = class EventBusService {
    constructor(dlq) {
        this.dlq = dlq;
        this.logger = new common_1.Logger(EventBusService_1.name);
        this.handlers = new Map();
    }
    on(eventName, handler) {
        const existing = this.handlers.get(eventName) ?? [];
        this.handlers.set(eventName, [...existing, handler]);
    }
    async emit(eventName, payload, context) {
        const handlers = this.handlers.get(eventName) ?? [];
        this.logger.log(`Event: ${eventName} — ${handlers.length} handler(s)`);
        for (const handler of handlers) {
            try {
                await handler(payload, context);
            }
            catch (err) {
                this.logger.error(`Handler failed for ${eventName}: ${err.message}`);
                await this.dlq.enqueueDeadLetter({
                    eventName,
                    payload,
                    error: err.message,
                });
            }
        }
    }
};
exports.EventBusService = EventBusService;
exports.EventBusService = EventBusService = EventBusService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [dlq_service_1.DLQService])
], EventBusService);
//# sourceMappingURL=event-bus.service.js.map