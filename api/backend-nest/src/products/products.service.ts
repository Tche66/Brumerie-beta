import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // ── Créer un produit ──────────────────────────────────────────
  async createProduct(dto: CreateProductDto, sellerId: string) {
    const seller = await this.prisma.user.findUnique({
      where: { firebaseUid: sellerId },
      select: { name: true, phone: true, photoURL: true, isVerified: true, isPremium: true, isBanned: true },
    });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    if (seller.isBanned) throw new ForbiddenException('Compte suspendu');

    const product = await this.prisma.product.create({
      data: {
        title:          dto.title,
        description:    dto.description,
        price:          dto.price,
        originalPrice:  dto.originalPrice,
        category:       dto.category,
        neighborhood:   dto.neighborhood,
        neighborhoods:  dto.neighborhoods ?? [dto.neighborhood],
        images:         dto.images,
        condition:      dto.condition as any,
        quantity:       dto.quantity ?? 1,
        status:         (dto.status as any) ?? 'active',
        sellerId,
        sellerName:     seller.name,
        sellerPhone:    seller.phone ?? undefined,
        sellerPhoto:    seller.photoURL ?? undefined,
        sellerVerified: seller.isVerified,
        sellerPremium:  seller.isPremium,
      },
    });

    // Incrémenter le compteur de produits du vendeur
    if (dto.status !== 'draft') {
      await this.prisma.user.update({
        where: { firebaseUid: sellerId },
        data: { productCount: { increment: 1 } },
      });
    }

    return product;
  }

  // ── Liste des produits (accueil) ──────────────────────────────
  async getProducts(filters?: {
    category?: string;
    neighborhood?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }) {
    const take = filters?.limit ?? 50;

    const where: any = {
      status: { in: ['active', 'sold'] },
      ...(filters?.category && filters.category !== 'all' ? { category: filters.category } : {}),
      ...(filters?.neighborhood && filters.neighborhood !== 'all'
        ? { neighborhoods: { has: filters.neighborhood } }
        : {}),
      ...(filters?.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
              { category: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const products = await this.prisma.product.findMany({
      where,
      orderBy: [
        { sellerVerified: 'desc' },
        { createdAt: 'desc' },
      ],
      take,
      ...(filters?.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    });

    return {
      products,
      nextCursor: products.length === take ? products[products.length - 1].id : null,
    };
  }

  // ── Produit par ID (UUID Neon ou firebaseId) ───────────────────
  async getProductById(productId: string) {
    let product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        likes: { select: { userId: true } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!product) {
      product = await this.prisma.product.findUnique({
        where: { firebaseId: productId },
        include: {
          likes: { select: { userId: true } },
          comments: { orderBy: { createdAt: 'asc' } },
        },
      });
    }

    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  // ── Produits d'un vendeur ─────────────────────────────────────
  async getSellerProducts(sellerId: string, status?: string) {
    return this.prisma.product.findMany({
      where: {
        sellerId,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Mettre à jour un produit ──────────────────────────────────
  async updateProduct(productId: string, dto: UpdateProductDto, userId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable');
    if (product.sellerId !== userId) throw new ForbiddenException('Accès refusé');

    return this.prisma.product.update({
      where: { id: productId },
      data: { ...dto } as any,
    });
  }

  // ── Supprimer un produit ──────────────────────────────────────
  async deleteProduct(productId: string, userId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable');
    if (product.sellerId !== userId) throw new ForbiddenException('Accès refusé');

    await this.prisma.product.delete({ where: { id: productId } });
    await this.prisma.user.update({
      where: { firebaseUid: userId },
      data: { productCount: { decrement: 1 } },
    });
    return { deleted: true };
  }

  // ── Incrémenter les compteurs ─────────────────────────────────
  async incrementView(productId: string) {
    return this.prisma.product.update({
      where: { id: productId },
      data: { viewCount: { increment: 1 } },
    });
  }

  async incrementWhatsApp(productId: string) {
    return this.prisma.product.update({
      where: { id: productId },
      data: { whatsappClickCount: { increment: 1 } },
    });
  }

  // ── Toggle Like ───────────────────────────────────────────────
  async toggleLike(productId: string, userId: string) {
    const existing = await this.prisma.productLike.findUnique({
      where: { productId_userId: { productId, userId } },
    });

    if (existing) {
      await this.prisma.productLike.delete({
        where: { productId_userId: { productId, userId } },
      });
      await this.prisma.product.update({
        where: { id: productId },
        data: { likeCount: { decrement: 1 } },
      });
      return { liked: false };
    } else {
      await this.prisma.productLike.create({ data: { productId, userId } });
      await this.prisma.product.update({
        where: { id: productId },
        data: { likeCount: { increment: 1 } },
      });
      return { liked: true };
    }
  }

  // ── Ajouter un commentaire ────────────────────────────────────
  async addComment(
    productId: string,
    userId: string,
    text: string,
    photoUrl?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: userId },
      select: { name: true, photoURL: true, isVerified: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (text.length > 500) throw new ForbiddenException('Commentaire trop long');

    const comment = await this.prisma.productComment.create({
      data: {
        productId,
        userId,
        userName:     user.name,
        userPhoto:    user.photoURL ?? undefined,
        userVerified: user.isVerified,
        text,
        photoUrl,
      },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: { commentCount: { increment: 1 } },
    });

    return comment;
  }

  // ── Supprimer un commentaire ──────────────────────────────────
  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.productComment.findUnique({
      where: { id: commentId },
      include: { product: { select: { sellerId: true } } },
    });
    if (!comment) throw new NotFoundException('Commentaire introuvable');

    const canDelete = comment.userId === userId || comment.product.sellerId === userId;
    if (!canDelete) throw new ForbiddenException('Accès refusé');

    await this.prisma.productComment.delete({ where: { id: commentId } });
    await this.prisma.product.update({
      where: { id: comment.productId },
      data: { commentCount: { decrement: 1 } },
    });
    return { deleted: true };
  }

  // ── Produits tendance ─────────────────────────────────────────
  async getTrending() {
    return this.prisma.product.findMany({
      where: { status: 'active' },
      orderBy: [
        { likeCount: 'desc' },
        { viewCount: 'desc' },
      ],
      take: 20,
    });
  }

  // ── Bookmark ──────────────────────────────────────────────────
  async toggleBookmark(productId: string, userId: string) {
    const existing = await this.prisma.bookmark.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await this.prisma.bookmark.delete({
        where: { userId_productId: { userId, productId } },
      });
      await this.prisma.product.update({
        where: { id: productId },
        data: { bookmarkCount: { decrement: 1 } },
      });
      return { bookmarked: false };
    } else {
      await this.prisma.bookmark.create({ data: { userId, productId } });
      await this.prisma.product.update({
        where: { id: productId },
        data: { bookmarkCount: { increment: 1 } },
      });
      return { bookmarked: true };
    }
  }

  // ── Bookmarks d'un user ───────────────────────────────────────
  async getUserBookmarks(userId: string) {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    return bookmarks.map(b => b.product);
  }
}
