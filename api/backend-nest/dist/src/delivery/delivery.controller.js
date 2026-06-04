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
exports.DeliveryController = void 0;
const common_1 = require("@nestjs/common");
const delivery_service_1 = require("./delivery.service");
const firebase_auth_guard_1 = require("../common/guards/firebase-auth.guard");
let DeliveryController = class DeliveryController {
    constructor(deliveryService) {
        this.deliveryService = deliveryService;
    }
    async getAvailable(zone) {
        return this.deliveryService.getAvailableDeliverers(zone);
    }
    async getMyOrders(req) {
        return this.deliveryService.getDelivererOrders(req.user.uid);
    }
    async calcFee(delivererId, from, to) {
        return this.deliveryService.calcDeliveryFee(delivererId, from, to);
    }
    async assign(body, req) {
        return this.deliveryService.assignDeliverer({ ...body, requestedBy: req.user.uid });
    }
    async accept(orderId, req) {
        return this.deliveryService.acceptDelivery(orderId, req.user.uid);
    }
    async pickup(orderId, req) {
        return this.deliveryService.pickupOrder(orderId, req.user.uid);
    }
    async validate(orderId, body, req) {
        return this.deliveryService.validateDelivery(orderId, body.code, req.user.uid);
    }
};
exports.DeliveryController = DeliveryController;
__decorate([
    (0, common_1.Get)('available'),
    __param(0, (0, common_1.Query)('zone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "getAvailable", null);
__decorate([
    (0, common_1.Get)('my-orders'),
    (0, common_1.UseGuards)(firebase_auth_guard_1.FirebaseAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "getMyOrders", null);
__decorate([
    (0, common_1.Get)('fee'),
    __param(0, (0, common_1.Query)('delivererId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "calcFee", null);
__decorate([
    (0, common_1.Post)('assign'),
    (0, common_1.UseGuards)(firebase_auth_guard_1.FirebaseAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "assign", null);
__decorate([
    (0, common_1.Patch)(':orderId/accept'),
    (0, common_1.UseGuards)(firebase_auth_guard_1.FirebaseAuthGuard),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "accept", null);
__decorate([
    (0, common_1.Patch)(':orderId/pickup'),
    (0, common_1.UseGuards)(firebase_auth_guard_1.FirebaseAuthGuard),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "pickup", null);
__decorate([
    (0, common_1.Patch)(':orderId/validate'),
    (0, common_1.UseGuards)(firebase_auth_guard_1.FirebaseAuthGuard),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DeliveryController.prototype, "validate", null);
exports.DeliveryController = DeliveryController = __decorate([
    (0, common_1.Controller)('delivery'),
    __metadata("design:paramtypes", [delivery_service_1.DeliveryService])
], DeliveryController);
//# sourceMappingURL=delivery.controller.js.map