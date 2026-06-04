export declare class CreateProductDto {
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    category: string;
    neighborhood: string;
    neighborhoods?: string[];
    images: string[];
    condition?: string;
    quantity?: number;
    status?: string;
}
