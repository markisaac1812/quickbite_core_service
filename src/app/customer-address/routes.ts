import {Router} from "express";
import { customerAddressController } from "./controller/customer-address.controller";
import { authenticate } from "../../common/auth/guard";

export const customerAddressRouter = Router();
customerAddressRouter.get('/', authenticate, customerAddressController.getAll);