import {Router} from "express"
import { healthRouter } from "./app/health/health.routes"
import { authRouter } from "./app/auth/routes"
import { userRouter } from "./app/user/routes"
import { customerAddressRouter } from "./app/customer-address/routes"
import { restaurantRouter } from "./app/restaurant/routes"
import { branchRouter } from "./app/branch/routes"

export const routes = Router()

routes.use('/health', healthRouter)
routes.use('/auth', authRouter)
routes.use('/users', userRouter)
routes.use('/customer/addresses',customerAddressRouter)
routes.use('/restaurants', restaurantRouter)
routes.use('/', branchRouter)