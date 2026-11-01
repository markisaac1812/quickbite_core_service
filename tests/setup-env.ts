import {config} from "dotenv";
import path from "path";

// Must run before anything imports src/lib/config/env.ts. dotenv never
// overrides a key that is already set, so .env.test wins over .env.
// __dirname is <root>/tests, so the file is one level up.
config({path: path.resolve(__dirname, "../.env.test"), quiet: true});
