import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertUserDto } from './dto/upsert-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ── Sync Firebase → Neon (appelé à chaque login) ─────────────
  async upsertUser(dto: UpsertUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { firebaseUid: dto.firebaseUid },
      select: { name: true, photoURL: true },
    });

    return this.prisma.user.upsert({
      where: { firebaseUid: dto.firebaseUid },
      update: {
        email: dto.email,
        phone: dto.phone,
        // Ne jamais écraser le nom/photo si l'utilisateur en a déjà un custom
        ...(existing?.name ? {} : { name: dto.name }),
        ...(existing?.photoURL ? {} : { photoURL: dto.photoURL }),
      },
      create: {
        firebaseUid: dto.firebaseUid,
        email:       dto.email,
        name:        dto.name,
        phone:       dto.phone,
        photoURL:    dto.photoURL,
        role:        (dto.role as any) ?? 'buyer',
        referralCode: this.generateReferralCode(dto.name),
      },
    });
  }

  // ── Récupérer un user par firebaseUid ─────────────────────────
  async getUserByFirebaseUid(firebaseUid: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        name: true,
        phone: true,
        photoURL: true,
        role: true,
        tier: true,
        neighborhood: true,
        bio: true,
        isVerified: true,
        isPremium: true,
        isBanned: true,
        trustScore: true,
        reviewCount: true,
        followerCount: true,
        referralCode: true,
        referralCount: true,
        loyaltyPoints: true,
        hasPhysicalShop: true,
        managesDelivery: true,
        deliveryAvailable: true,
        deliveryPriceSameZone: true,
        deliveryPriceOtherZone: true,
        deliveryZones: true,
        shopUsername: true,
        shopBio: true,
        shopSlogan: true,
        shopThemeColor: true,
        shopBanner: true,
        shopWhatsapp: true,
        shopInstagram: true,
        shopTiktok: true,
        shopCategories: true,
        wishlistPublic: true,
        wishlistSlug: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  // ── Profil public d'un user ───────────────────────────────────
  async getPublicProfile(firebaseUid: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: {
        firebaseUid: true,
        name: true,
        photoURL: true,
        role: true,
        tier: true,
        neighborhood: true,
        bio: true,
        isVerified: true,
        isPremium: true,
        trustScore: true,
        reviewCount: true,
        followerCount: true,
        hasPhysicalShop: true,
        managesDelivery: true,
        deliveryAvailable: true,
        deliveryPriceSameZone: true,
        deliveryPriceOtherZone: true,
        deliveryZones: true,
        shopUsername: true,
        shopBio: true,
        shopSlogan: true,
        shopThemeColor: true,
        shopBanner: true,
        shopWhatsapp: true,
        shopInstagram: true,
        shopTiktok: true,
        shopCategories: true,
        wishlistPublic: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  // ── Mettre à jour le profil ───────────────────────────────────
  async updateProfile(firebaseUid: string, dto: UpdateUserDto) {
    // Vérifier que le shopUsername est unique si fourni
    if (dto.shopUsername) {
      const existing = await this.prisma.user.findFirst({
        where: {
          shopUsername: dto.shopUsername,
          NOT: { firebaseUid },
        },
      });
      if (existing) throw new ConflictException('Ce nom de boutique est déjà pris');
    }

    return this.prisma.user.update({
      where: { firebaseUid },
      data: { ...dto } as any,
    });
  }

  // ── Suivre / ne plus suivre un vendeur ────────────────────────
  async toggleFollow(followerId: string, sellerId: string) {
    const follower = await this.prisma.user.findUnique({
      where: { firebaseUid: followerId },
      select: { followingSellerIds: true },
    });
    if (!follower) throw new NotFoundException('Utilisateur introuvable');

    const isFollowing = follower.followingSellerIds.includes(sellerId);

    if (isFollowing) {
      // Unfollow
      await this.prisma.user.update({
        where: { firebaseUid: followerId },
        data: {
          followingSellerIds: {
            set: follower.followingSellerIds.filter(id => id !== sellerId),
          },
        },
      });
      await this.prisma.user.update({
        where: { firebaseUid: sellerId },
        data: { followerCount: { decrement: 1 } },
      });
      return { following: false };
    } else {
      // Follow
      await this.prisma.user.update({
        where: { firebaseUid: followerId },
        data: {
          followingSellerIds: {
            push: sellerId,
          },
        },
      });
      await this.prisma.user.update({
        where: { firebaseUid: sellerId },
        data: { followerCount: { increment: 1 } },
      });
      return { following: true };
    }
  }

  // ── Rechercher des vendeurs ───────────────────────────────────
  async searchSellers(query: string, neighborhood?: string) {
    return this.prisma.user.findMany({
      where: {
        role: { in: ['seller', 'livreur'] },
        isBanned: false,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { shopUsername: { contains: query, mode: 'insensitive' } },
          { bio: { contains: query, mode: 'insensitive' } },
        ],
        ...(neighborhood ? { neighborhood } : {}),
      },
      select: {
        firebaseUid: true,
        name: true,
        photoURL: true,
        tier: true,
        neighborhood: true,
        trustScore: true,
        isVerified: true,
        isPremium: true,
        shopUsername: true,
        shopBio: true,
      },
      take: 20,
    });
  }

  // ── Mettre à jour la présence ─────────────────────────────────
  async updatePresence(firebaseUid: string) {
    return this.prisma.user.update({
      where: { firebaseUid },
      data: { lastActiveAt: new Date() },
    });
  }

  // ── Générer un code de parrainage unique ──────────────────────
  private generateReferralCode(name: string): string {
    const base = name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${base}${suffix}`;
  }
}
