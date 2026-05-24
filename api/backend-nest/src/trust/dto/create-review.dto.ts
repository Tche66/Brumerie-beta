import {
  IsString, IsNumber, IsOptional, IsIn, Min, Max,
} from 'class-validator';

export class CreateReviewDto {
  @IsString() orderId: string;
  @IsString() productId: string;
  @IsString() productTitle: string;
  @IsString() toUserId: string;

  @IsIn(['buyer_to_seller','seller_to_buyer','buyer_to_deliverer','seller_to_deliverer'])
  role: 'buyer_to_seller' | 'seller_to_buyer' | 'buyer_to_deliverer' | 'seller_to_deliverer';

  @IsNumber() @Min(1) @Max(5) rating: number;
  @IsString() @IsOptional() comment?: string;
  @IsString() @IsOptional() fromUserNeighborhood?: string;
}
