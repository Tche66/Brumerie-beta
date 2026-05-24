"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingService = void 0;
const common_1 = require("@nestjs/common");
const firebase_config_1 = require("../firebase.config");
let MessagingService = class MessagingService {
    constructor() {
        this.db = firebase_config_1.firebaseAdmin.firestore();
    }
    async getUserConversations(userId) {
        const snapshot = await this.db
            .collection('conversations')
            .where('participants', 'array-contains', userId)
            .orderBy('lastMessageAt', 'desc')
            .limit(50)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    async getMessages(conversationId, limit = 30) {
        const snapshot = await this.db
            .collection('conversations')
            .doc(conversationId)
            .collection('messages')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    async sendMessage(data, senderId) {
        const messageRef = this.db
            .collection('conversations')
            .doc(data.conversationId)
            .collection('messages')
            .doc();
        const message = {
            id: messageRef.id,
            senderId,
            content: data.content,
            createdAt: new Date(),
        };
        await messageRef.set(message);
        return message;
    }
};
exports.MessagingService = MessagingService;
exports.MessagingService = MessagingService = __decorate([
    (0, common_1.Injectable)()
], MessagingService);
//# sourceMappingURL=messaging.service.js.map