import fs from "fs"
import path from "path"
import {
    ensureDir,
    getUploadTmpDir,
    getMetaPath,
    getChunkPath,
    getFinalFilePath,
    FILES_ROOT
} from "../utils/path"

type Meta = {
    uploadId: string
    fileName: string
    fileSize: number
    chunkSize: number
    totalChunks: number
}

export async function initUploadTask(meta:Meta) {
    const dir = getUploadTmpDir(meta.uploadId)
    ensureDir(dir)

    const metaPath = getMetaPath(meta.uploadId)
    if(!fs.existsSync(metaPath)) {
        fs.writeFileSync(metaPath,JSON.stringify(meta,null,2),"utf-8")
    }    
}

export async function saveChunkToDisk(uploadId: string,index:number,buffer: Buffer){
    const dir = getUploadTmpDir(uploadId)
    ensureDir(dir)

    const chunkPath = getChunkPath(uploadId,index)

    // 幂等：如果已存在就直接返回（断点续传重复提交不会炸）
    if(fs.existsSync(chunkPath)) return

    fs.writeFileSync(chunkPath,buffer)
}

export async function listUploadedChunks(uploadId: string): Promise<number[]> {
    const dir = getUploadTmpDir(uploadId)
    if(!fs.existsSync(dir)) return []

    const files = fs.readdirSync(dir)
    const uploaded: number[] = []
    for(const name of files) {
        const m = name.match(/^chunk-(\d+)\.part$/)
        if (m) uploaded.push(Number(m[1]))
    }

    uploaded.sort((a,b) => a - b)
    return uploaded
}

export async function mergeUploadChunks(uploadId: string):Promise<{ filePath:string}>{
    const metaPath = getMetaPath(uploadId)
    if(!fs.existsSync(metaPath)) {
        throw new Error("meta.json not found,call /upload/init first")
    }

    const meta = JSON.parse(fs.readFileSync(metaPath,"utf-8")) as Meta
    
    // 检验分片是否齐全
    const uploaded = await listUploadedChunks(uploadId)
    if(uploaded.length !== meta.totalChunks) {
        throw new Error(`chunks not complete: uploaded=${uploaded.length},total=${meta.totalChunks}`)
    }

    ensureDir(FILES_ROOT)
    const finalPath = getFinalFilePath(uploadId,meta.fileName)

    // 合并：按顺序追加写入
    const writeStream = fs.createWriteStream(finalPath)

    for(let i = 0;i < meta.totalChunks;i++) {
        const chunkPath = getChunkPath(uploadId,i)
        if(!fs.existsSync(chunkPath)) {
            writeStream.close()
            throw new Error(`missing chunk ${i}`)
        }
        const data = fs.readFileSync(chunkPath)
        writeStream.write(data)
    }

    writeStream.end()

    return { filePath:finalPath}
}
