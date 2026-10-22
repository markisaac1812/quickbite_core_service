export interface BranchProductRow {
    productId: number;
    name: string;
    imageUrl: string | null;
    price: number;
    stock: number;
    isAvailable: boolean;
}

export interface ReserveStockInput {
    productId: number;
    quantity: number;
}

export interface ReserveStockApplied {
    productId: number;
    newStock: number;
}

export interface ReserveStockResult {
    ok: true;
    applied: ReserveStockApplied[];
}

export interface OutOfStockItem {
    productId: number;
    requested: number;
    available: number;
}
