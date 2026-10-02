import express from "express";
import { routes } from "./routes";
import {errorHandler} from "./common/error/errorHandler";
import cookieParser from "cookie-parser";

export function createApp() {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api', routes);
    app.use(errorHandler);
    return app;
}
