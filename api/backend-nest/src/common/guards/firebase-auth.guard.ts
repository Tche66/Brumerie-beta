import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { firebaseAdmin } from '../../firebase/firebase.config';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = await firebaseAdmin.auth().verifyIdToken(token);
      request.user = decoded;
      return true;
    } catch {
      return false;
    }
  }
}