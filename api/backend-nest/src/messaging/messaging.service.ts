import { Injectable } from '@nestjs/common';
import { firebaseAdmin } from '../firebase.config';

@Injectable()
export class MessagingService {
  private db = firebaseAdmin.firestore();

  async getUserConversations(userId: string) {
    const snapshot = await this.db
      .collection('conversations')
      .where('participants', 'array-contains', userId)
      .orderBy('lastMessageAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getMessages(conversationId: string, limit = 30) {
    const snapshot = await this.db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async sendMessage(
    data: { conversationId: string; content: string },
    senderId: string,
  ) {
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
}
