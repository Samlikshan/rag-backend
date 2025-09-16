import chatRoutes from "./chat.routes";
import { Router } from "express";

const router = Router();

router.use("/chat", chatRoutes);

export default router;
