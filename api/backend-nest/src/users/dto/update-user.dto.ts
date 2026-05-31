import { IsString, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class UpdateUserDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() photoURL?: string;
  @IsString() @IsOptional() bio?: string;
  @IsString() @IsOptional() neighborhood?: string;
  @IsBoolean() @IsOptional() hasPhysicalShop?: boolean;
  @IsBoolean() @IsOptional() managesDelivery?: boolean;
  @IsBoolean() @IsOptional() deliveryAvailable?: boolean;
  @IsNumber() @IsOptional() deliveryPriceSameZone?: number;
  @IsNumber() @IsOptional() deliveryPriceOtherZone?: number;
  @IsArray() @IsOptional() deliveryZones?: string[];
  @IsString() @IsOptional() shopUsername?: string;
  @IsString() @IsOptional() shopBio?: string;
  @IsString() @IsOptional() shopSlogan?: string;
  @IsString() @IsOptional() shopThemeColor?: string;
  @IsString() @IsOptional() shopBanner?: string;
  @IsString() @IsOptional() shopWhatsapp?: string;
  @IsString() @IsOptional() shopInstagram?: string;
  @IsString() @IsOptional() shopTiktok?: string;
  @IsArray() @IsOptional() shopCategories?: string[];
  @IsBoolean() @IsOptional() wishlistPublic?: boolean;
  @IsString() @IsOptional() wishlistSlug?: string;
}
