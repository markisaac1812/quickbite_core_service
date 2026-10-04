import {Request, Response,NextFunction} from 'express';
import {CustomerAddressService,customerAddressService} from "../service/customer-address.service";
import {validateBody} from "../../../common/validation/validate";
import {CreateAddressDTO} from "../dto/customer-address.dto";

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

    create = async(req: Request, res: Response, next: NextFunction)=>{
        try{
            const data = await validateBody(CreateAddressDTO, req.body);
            const address = await this.customerAddressService.createUserAddress(req.user?.userId!, data);
            return res.status(201).json({
                message: "Address created successfully",
                data: address});
        }catch(err){
            next(err)
        }
    }
}

export const customerAddressController = new CustomerAddressController(customerAddressService);