import path from "path"
import fs from "fs"

// 项目根目录
export const PROJECT_ROOT = process.cwd()

// 存储根目录
export const STORAGE_ROOT = path.join(PROJECT_ROOT,"storage")

// 临时分片目录
export const TMP_ROOT = path.join(STORAGE_ROOT,"tmp")

// 合并后文件目录
export const FILES_ROOT = path.join(STORAGE_ROOT,"files")

// 确保目录存在 （不存在就创建）
export function ensureDir(dirPath:string) {
    if(!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath,{ recursive: true })
    }
}

// 获取某个 uploadId 的临时目录 : storage/tmp/<uploadId>
export function getUploadTmpDir(uploadId:string){
    return path.join(TMP_ROOT, uploadId)
}

// meta.json : storage/tmp/<uploadId>/meta.json
export function getMetaPath(uploadId:string) {
    return path.join(getUploadTmpDir(uploadId),"meta.json")
}

// chunk 文件路径： storage/tmp/<uploadId>/chunk-<index>.part
export function getChunkPath(uploadId:string,index:number) {
    return path.join(getUploadTmpDir(uploadId),`chunk-${index}.part`)
}

// 合并后的最终文件： storage/files/<uploadId>-<fileName>
export function getFinalFilePath(uploadId:string,fileName:string){
    return path.join(FILES_ROOT,`${uploadId}-${fileName}`)
}

// 初始化 storage 目录
export function initStorageDirs(){
    ensureDir(STORAGE_ROOT)
    ensureDir(TMP_ROOT)
    ensureDir(FILES_ROOT)
}