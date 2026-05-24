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
exports.TrustController = void 0;
const common_1 = require("@nestjs/common");
const trust_service_1 = require("./trust.service");
const firebase_auth_guard_1 = require("../common/guards/firebase-auth.guard");
const create_review_dto_1 = require("./dto/create-review.dto");
let TrustController = class TrustController {
    constructor(trustService) {
        this.trustService = trustService;
    }
    async createReview(dto, req) {
        return this.trustService.createReview(dto, req.user.uid);
    }
    async getTrustScore(userId) {
        return this.trustService.getTrustScore(userId);
    }
    async createReport(body, req) {
        return this.trustService.createTrustReport(req.user.uid, body.reportedId, body.details);
    }
};
exports.TrustController = TrustController;
__decorate([
    (0, common_1.Post)('reviews'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_review_dto_1.CreateReviewDto, Object]),
    __metadata("design:returntype", Promise)
], TrustController.prototype, "createReview", null);
__decorate([
    (0, common_1.Get)('score/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TrustController.prototype, "getTrustScore", null);
__decorate([
    (0, common_1.Post)('reports'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TrustController.prototype, "createReport", null);
exports.TrustController = TrustController = __decorate([
    (0, common_1.Controller)('trust'),
    (0, common_1.UseGuards)(firebase_auth_guard_1.FirebaseAuthGuard),
    __metadata("design:paramtypes", [trust_service_1.TrustService])
], TrustController);
//# sourceMappingURL=trust.controller.js.map