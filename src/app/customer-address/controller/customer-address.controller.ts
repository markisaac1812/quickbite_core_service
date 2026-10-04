import {Request, Response,NextFunction} from 'express';
import {CustomerAddressService,customerAddressService} from "../service/customer-address.service";

export class CustomerAddressController{
    constructor(private readonly customerAddressService: CustomerAddressService){}

    getAll = async(req: Request, res: Response, next: NextFunction)=>{
        try{
            const addresses = await this.customerAddressService.getUserById(req.user?.userId!);
            return res.status(200).json({data: addresses});
        }catch(err){
            next(err)
        }
    }
}

export const customerAddressController = new CustomerAddressController(customerAddressService);