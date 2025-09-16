import { Router } from "express";
import {
  createSession,
  queryChat,
  getHistory,
  resetSession,
} from "../controllers/chat.controller";

const router = Router();

router.get("/:sessionId/history", getHistory);
router.post("/session", createSession);
router.post("/query", queryChat);
router.post("/:sessionId/reset", resetSession);

export default router;
