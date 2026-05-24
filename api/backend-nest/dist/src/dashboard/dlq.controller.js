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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DLQDashboardController = void 0;
const common_1 = require("@nestjs/common");
const dlq_service_1 = require("../infrastructure/event-bus/dlq.service");
let DLQDashboardController = class DLQDashboardController {
    constructor(dlq) {
        this.dlq = dlq;
    }
    async getDLQ() {
        return this.dlq.getDLQItems();
    }
    async replayDLQItem(id) {
        const item = await this.dlq.replayDLQItem(id);
        if (!item) {
            throw new Error('Item not found');
        }
        return { status: 'queued_for_replay', item };
    }
};
exports.DLQDashboardController = DLQDashboardController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DLQDashboardController.prototype, "getDLQ", null);
__decorate([
    (0, common_1.Post)(':id/replay'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DLQDashboardController.prototype, "replayDLQItem", null);
exports.DLQDashboardController = DLQDashboardController = __decorate([
    (0, common_1.Controller)('dashboard/dlq'),
    __metadata("design:paramtypes", [dlq_service_1.DLQService])
], DLQDashboardController);
//# sourceMappingURL=dlq.controller.js.map