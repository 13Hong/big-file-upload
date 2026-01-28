import type { Request,Response} from "express"
import {
    initUploadTask,
    listUploadedChunks,
    saveChunkToDisk,
    mergeUploadChunks
} from "../services/upload.service"


export async function initUpload(req:Request,res: Response) {
    const { uploadId, fileName,fileSize,chunkSize,totalChunks } = req.body || {}
    if(!uploadId || !fileName || !totalChunks) {
        return res.status(400).json({ ok:false,message:"missing uploadId/fileName/totalChunks"})
    }

    await initUploadTask({
        uploadId,
        fileName,
        fileSize: Number(fileSize ?? 0),
        chunkSize: Number(chunkSize ?? 0),
        totalChunks: Number(totalChunks)
    })
    res.json({ ok:true })
}

export async function getStatus(req:Request,res:Response) {
    const uploadId = String(req.query.uploadId || "")
    if(!uploadId) return res.status(400).json({ ok:false,message: "missing uploadId" })
    
    const uploaded = await listUploadedChunks(uploadId)
    res.json({ ok:true, uploaded })
}

export async function uploadChunk(req:Request,res:Response) {
    const { uploadId, index } = req.body || {};
    console.log(uploadId,index)
    const file = (req as any).file as Express.Multer.File | undefined;


    if (!uploadId || index === undefined) {
    return res.status(400).json({ ok: false, message: "missing uploadId/index" });
    }
    if (!file) {
    return res.status(400).json({ ok: false, message: "missing chunk file field: chunk" });
    }


    await saveChunkToDisk(String(uploadId), Number(index), file.buffer);
    res.json({ ok: true });
}

export async function mergeChunks(req: Request, res: Response) {
    const { uploadId } = req.body || {};
    if (!uploadId) return res.status(400).json({ ok: false, message: "missing uploadId" });


    const result = await mergeUploadChunks(String(uploadId));
    res.json({ ok: true, filePath: result.filePath });
}