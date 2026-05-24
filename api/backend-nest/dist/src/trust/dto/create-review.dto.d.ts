export declare class CreateReviewDto {
    orderId: string;
    productId: string;
    productTitle: string;
    toUserId: string;
    role: 'buyer_to_seller' | 'seller_to_buyer' | 'buyer_to_deliverer' | 'seller_to_deliverer';
    rating: number;
    comment?: string;
    fromUserNeighborhood?: string;
}
