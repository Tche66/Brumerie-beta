import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, IsIn, Min } from 'class-validator';

export class CreateProductDto {
  @IsString() title: string;
  @IsString() description: string;
  @IsNumber() @Min(0) price: number;
  @IsNumber() @IsOptional() originalPrice?: number;
  @IsString() category: string;
  @IsString() neighborhood: string;
  @IsArray() @IsOptional() neighborhoods?: string[];
  @IsArray() images: string[];
  @IsIn(['new', 'like_new', 'second_hand']) @IsOptional() condition?: string;
  @IsNumber() @IsOptional() quantity?: number;
  @IsIn(['active', 'draft']) @IsOptional() status?: string;
}
