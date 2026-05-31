import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, IsIn, Min } from 'class-validator';

export class UpdateProductDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @Min(0) @IsOptional() price?: number;
  @IsNumber() @IsOptional() originalPrice?: number;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() neighborhood?: string;
  @IsArray() @IsOptional() neighborhoods?: string[];
  @IsArray() @IsOptional() images?: string[];
  @IsIn(['new', 'like_new', 'second_hand']) @IsOptional() condition?: string;
  @IsNumber() @IsOptional() quantity?: number;
  @IsIn(['active', 'sold', 'paused', 'draft']) @IsOptional() status?: string;
  @IsNumber() @IsOptional() promoPrice?: number;
  @IsBoolean() @IsOptional() flashSaleActive?: boolean;
  @IsString() @IsOptional() flashSaleLabel?: string;
}
