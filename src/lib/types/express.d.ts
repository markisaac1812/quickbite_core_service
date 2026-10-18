declare namespace Express {
  interface Request {
    correlationId?: string;
    user?: {
      userId: number;
      email: string;
      role: string;  
      // sepecfic for restaurant users only
      restaurantId?: number;
      restaurantRole?: string;
      branchIds?: number[];
    };
  }
}