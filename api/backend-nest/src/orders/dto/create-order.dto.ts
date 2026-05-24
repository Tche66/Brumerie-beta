import {
  IsString, IsNumber, IsOptional, IsBoolean, IsIn,
} from 'class-validator';

export class CreateOrderDto {
  // Vendeur & produit
  @IsString() sellerId: string;
  @IsString() sellerName: string;
  @IsString() @IsOptional() sellerPhoto?: string;

  @IsString() productId: string;
  @IsString() productTitle: string;
  @IsString() productImage: string;
  @IsNumber() productPrice: number;

  // Montants
  @IsNumber() deliveryFee: number;
  @IsNumber() totalAmount: number;
  @IsNumber() @IsOptional() brumerieFee?: number;
  @IsNumber() sellerReceives: number;

  // Paiement
  @IsString() paymentMethod: string;
  @IsString() paymentPhone: string;
  @IsString() paymentHolderName: string;
  @IsString() @IsOptional() paymentWaveLink?: string;

  // Type de livraison
  @IsIn(['delivery', 'in_person']) deliveryType: 'delivery' | 'in_person';
  @IsBoolean() @IsOptional() isCOD?: boolean;

  // Acheteur — Address-Web
  @IsString() @IsOptional() buyerAWCode?: string;
  @IsString() @IsOptional() buyerAWRepere?: string;
  @IsNumber() @IsOptional() buyerAWLatitude?: number;
  @IsNumber() @IsOptional() buyerAWLongitude?: number;
}
