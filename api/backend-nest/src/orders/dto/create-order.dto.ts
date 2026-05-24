import { IsUUID, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  sellerId: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  productId?: string;
}