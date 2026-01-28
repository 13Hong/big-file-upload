import { Router } from "express";
import multer from "multer"
import { initUpload,getStatus,uploadChunk,mergeChunks } from "../controllers/upload.controller"

const router = Router()

// multer 先用内存存储，后面再手动写入到定义的 chunkPath
const upload = multer({ storage:multer.memoryStorage() })

router.post("/init", initUpload)
router.get("/status", getStatus)
router.post("/chunk", upload.single("chunk"), uploadChunk)
router.post("/merge", mergeChunks)

export default router