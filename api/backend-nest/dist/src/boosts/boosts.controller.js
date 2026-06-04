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
exports.BoostsController = void 0;
const common_1 = require("@nestjs/common");
const boosts_service_1 = require("./boosts.service");
const firebase_auth_guard_1 = require("../common/guards/firebase-auth.guard");
let BoostsController = class BoostsController {
    constructor(boostsService) {
        this.boostsService = boostsService;
    }
    async createBoost(body, req) {
        return this.boostsService.createBoost({ ...body, sellerId: req.user.uid });
    }
    async getBoostedIds() {
        return this.boostsService.getBoostedProductIds();
    }
    async getMyBoosts(req) {
        return this.boostsService.getSellerBoosts(req.user.uid);
    }
    async getPending() {
        return this.boostsService.getPendingBoosts();
    }
    async getAll() {
        return this.boostsService.getAllBoosts();
    }
    async activate(id, req) {
        return this.boostsService.activateBoost(id, req.user.uid);
    }
    async reject(id, body, req) {
        return this.boostsService.rejectBoost(id, req.user.uid, body.reason);
    }
};
exports.BoostsController = BoostsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(firebase_auth_guard_1.FirebaseAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BoostsController.prototype, "createBoost", null);
__decorate([
    (0, common_1.Get)('active'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BoostsController.prototype, "getBoostedIds", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, common_1.UseGuards)(firebase_auth_guard_1.FirebaseAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BoostsController.prototype, "getMyBoosts", null);
__decorate([
    (0, common_1.Get)('pending'),
    (0, common_1.UseGuards)(firebase_auth_guard_1.FirebaseAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BoostsController.prototype, "getPending", null);
__decorate([
    (0, common_1.Get)('all'),
    (0, common_1.UseGuards)(firebase_auth_guard_1.FirebaseAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BoostsController.prototype, "getAll", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    (0, common_1.UseGuards)(firebase_auth_guard_1.FirebaseAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BoostsController.prototype, "activate", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    (0, common_1.UseGuards)(firebase_auth_guard_1.FirebaseAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], BoostsController.prototype, "reject", null);
exports.BoostsController = BoostsController = __decorate([
    (0, common_1.Controller)('boosts'),
    __metadata("design:paramtypes", [boosts_service_1.BoostsService])
], BoostsController);
//# sourceMappingURL=boosts.controller.js.map