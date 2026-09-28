import { Router } from "express";
import { streamRealtime } from "../controllers/realtime.controller";

const router = Router();

router.get("/stream", streamRealtime);

export default router;