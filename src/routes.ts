import {Router} from "express"
import { healthRouter } from "./app/health/health.routes"
import { authRouter } from "./app/auth/routes"

export const routes = Router()

routes.use('/health', healthRouter)
routes.use('/auth', authRouter)