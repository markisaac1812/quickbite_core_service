import {Router} from "express"
import {pingDB} from "../../common/knex/knex"

export const healthRouter = Router()

healthRouter.get('/', async (req, res) => {
    try {
        await pingDB();
        res.status(200).json({ message: 'Database is healthy' });
    } catch (error) {
        res.status(500).json({ message: 'Database is not healthy' });
    }
});