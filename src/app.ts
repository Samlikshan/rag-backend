import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

import routes from "./routes/index";

const app = express();

const CLIENT_URL = process.env.CLIENT_URL;
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", routes);

app.use(errorHandler);

export default app;
