// src/services/userService.ts
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import { User } from '@/types';

/**
 * Récupérer un utilisateur par ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;

    return userDoc.data() as User;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Mettre à jour le profil utilisateur
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), updates);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Upload photo de profil
 */
export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  try {
    const photoRef = ref(storage, `avatars/${userId}`);
    await uploadBytes(photoRef, file);
    const url = await getDownloadURL(photoRef);

    // Mettre à jour l'URL dans Firestore
    await updateDoc(doc(db, 'users', userId), {
      photoURL: url,
    });

    return url;
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    throw error;
  }
}

/**
 * Incrémenter le compteur de ventes (manuel admin)
 */
export async function incrementSalesCount(userId: string): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const currentCount = userDoc.data().salesCount || 0;
      await updateDoc(doc(db, 'users', userId), {
        salesCount: currentCount + 1,
      });
    }
  } catch (error) {
    console.error('Error incrementing sales count:', error);
    throw error;
  }
}

/**
 * Activer/Désactiver badge vérifié (admin)
 */
export async function toggleVerifiedBadge(userId: string, isVerified: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      isVerified,
    });
  } catch (error) {
    console.error('Error toggling verified badge:', error);
    throw error;
  }
}
