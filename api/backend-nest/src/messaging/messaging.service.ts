import { Injectable } from '@nestjs/common';
import { firebaseAdmin } from '../../firebase/firebase.config';

@Injectable()
export class MessagingService {
  private db = firebaseAdmin.firestore();

  async getMessages(conversationId: string, limit = 30, before?: string) {
    let query: FirebaseFirestore.Query = this.db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (before) {
      const beforeDoc = await this.db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .doc(before)
        .get();
      
      if (beforeDoc.exists) {
        query = query.startAfter(beforeDoc);
      }
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async sendMessage(data: { conversationId: string; content: string }, senderId: string) {
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