declare namespace Express {
  interface Request {
    correlationId?: string;
    user?: {
      userid: number;
      email: string;
      role: string;  
    };
  }
}