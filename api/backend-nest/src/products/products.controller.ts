import {
  Controller, Get, Post, Put, Delete, Patch, Body, Param,
  Query, Req, UseGuards, Optional,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // GET /products — liste avec filtres
  @Get()
  async getProducts(
    @Query('category') category?: string,
    @Query('neighborhood') neighborhood?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.getProducts({
      category, neighborhood, search, cursor,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  // GET /products/trending — produits tendance
  @Get('trending')
  async getTrending() {
    return this.productsService.getTrending();
  }

  // GET /products/bookmarks — mes bookmarks
  @Get('bookmarks')
  @UseGuards(FirebaseAuthGuard)
  async getBookmarks(@Req() req: any) {
    return this.productsService.getUserBookmarks(req.user.uid);
  }

  // GET /products/seller/:sellerId — produits d'un vendeur
  @Get('seller/:sellerId')
  async getSellerProducts(
    @Param('sellerId') sellerId: string,
    @Query('status') status?: string,
  ) {
    return this.productsService.getSellerProducts(sellerId, status);
  }

  // GET /products/:id — détail d'un produit
  @Get(':id')
  async getProduct(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  // POST /products — créer un produit
  @Post()
  @UseGuards(FirebaseAuthGuard)
  async createProduct(@Body() dto: CreateProductDto, @Req() req: any) {
    return this.productsService.createProduct(dto, req.user.uid);
  }

  // PUT /products/:id — mettre à jour un produit
  @Put(':id')
  @UseGuards(FirebaseAuthGuard)
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: any,
  ) {
    return this.productsService.updateProduct(id, dto, req.user.uid);
  }

  // DELETE /products/:id — supprimer un produit
  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  async deleteProduct(@Param('id') id: string, @Req() req: any) {
    return this.productsService.deleteProduct(id, req.user.uid);
  }

  // PATCH /products/:id/view — incrémenter vues
  @Patch(':id/view')
  async incrementView(@Param('id') id: string) {
    return this.productsService.incrementView(id);
  }

  // PATCH /products/:id/whatsapp — incrémenter clics WhatsApp
  @Patch(':id/whatsapp')
  async incrementWhatsApp(@Param('id') id: string) {
    return this.productsService.incrementWhatsApp(id);
  }

  // POST /products/:id/like — toggle like
  @Post(':id/like')
  @UseGuards(FirebaseAuthGuard)
  async toggleLike(@Param('id') id: string, @Req() req: any) {
    return this.productsService.toggleLike(id, req.user.uid);
  }

  // POST /products/:id/bookmark — toggle bookmark
  @Post(':id/bookmark')
  @UseGuards(FirebaseAuthGuard)
  async toggleBookmark(@Param('id') id: string, @Req() req: any) {
    return this.productsService.toggleBookmark(id, req.user.uid);
  }

  // POST /products/:id/comments — ajouter un commentaire
  @Post(':id/comments')
  @UseGuards(FirebaseAuthGuard)
  async addComment(
    @Param('id') id: string,
    @Body() body: { text: string; photoUrl?: string },
    @Req() req: any,
  ) {
    return this.productsService.addComment(id, req.user.uid, body.text, body.photoUrl);
  }

  // DELETE /products/:id/comments/:commentId — supprimer un commentaire
  @Delete(':id/comments/:commentId')
  @UseGuards(FirebaseAuthGuard)
  async deleteComment(
    @Param('commentId') commentId: string,
    @Req() req: any,
  ) {
    return this.productsService.deleteComment(commentId, req.user.uid);
  }
}
