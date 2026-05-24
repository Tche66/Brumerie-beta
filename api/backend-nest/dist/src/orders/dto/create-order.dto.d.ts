export declare class CreateOrderDto {
    sellerId: string;
    sellerName: string;
    sellerPhoto?: string;
    productId: string;
    productTitle: string;
    productImage: string;
    productPrice: number;
    deliveryFee: number;
    totalAmount: number;
    brumerieFee?: number;
    sellerReceives: number;
    paymentMethod: string;
    paymentPhone: string;
    paymentHolderName: string;
    paymentWaveLink?: string;
    deliveryType: 'delivery' | 'in_person';
    isCOD?: boolean;
    buyerAWCode?: string;
    buyerAWRepere?: string;
    buyerAWLatitude?: number;
    buyerAWLongitude?: number;
}
