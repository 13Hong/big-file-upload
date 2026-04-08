import { ref } from "vue"
import { createChunks } from "../utils/chunk"
import { calcFileMD5 } from "../utils/fileHash"
import { runWithConcurrency } from "../utils/concurrency"
import { initUpload,getUploadStatus,uploadChunk,mergeUpload } from "../api/upload"

export const UploadStatus = {
    IDLE: 'idle',
    HASHING: 'hashing',
    UPLOADING: 'uploading',
    PAUSED: 'paused',
    SUCCESS: 'success',
    ERROR: 'error'
} as const;

export type UploadStatus = typeof UploadStatus[keyof typeof UploadStatus];

export function useChunkUpload(){
    const status = ref<UploadStatus>(UploadStatus.IDLE)
    const progress = ref(0)
    const uploadId = ref<string>("")
    const filePath = ref<string>("")

    const chunkSize = 1 * 1024 * 1024
    const concurrency = 4

    let abortController: AbortController | null = null
    let currentFile: File | null = null // 暂存文件对象以便 resume

    async function start(file:File) {
        // 重置状态
        reset()
        currentFile = file
        status.value = UploadStatus.HASHING

        try {
            // 生成 uploadId (Worker 计算)
            uploadId.value = await calcFileMD5(file)

            await uploadLogic()

        } catch (err: any) {
            console.error(err)
            status.value = UploadStatus.ERROR
        }
    }

    async function uploadLogic() {
        if(!currentFile || !uploadId.value) return

        status.value = UploadStatus.UPLOADING
        abortController = new AbortController()

        try {
             // 切片
             const chunks = createChunks(currentFile,chunkSize)
             const totalChunks = chunks.length
 
             // init
             await initUpload({
                 uploadId: uploadId.value,
                 fileName: currentFile.name,
                 fileSize: currentFile.size,
                 chunkSize,
                 totalChunks
             })
 
             // status (断点续传：跳过已上传)
             const backendStatus = await getUploadStatus(uploadId.value)
             const uploadedSet = new Set(backendStatus.uploaded ?? [])
             
             const needUpload = chunks.filter((c) => !uploadedSet.has(c.index))
 
             // 进度：已完成 + 本次完成
             const baseDone = uploadedSet.size
             const total = totalChunks

            // 如果全部已经上传
            if(needUpload.length === 0) {
                 progress.value = 100
                 await merge()
                 return
            }

            // 更新下初始进度
            progress.value = Math.floor((baseDone / total) * 100)
 
             const tasks = needUpload.map((c) => async () => {
                 const form = new FormData()
                 form.append("uploadId", uploadId.value)
                 form.append("index", String(c.index))
                 form.append("chunk",c.blob,`chunk-${c.index}.part`) 
                 
                 // 传递 signal 给每一个请求
                 await uploadChunk(form, abortController?.signal)
             })
 
             // 并发上传
             await runWithConcurrency(tasks,concurrency,(doneNow) => {
                 const done = baseDone + doneNow
                 progress.value = Math.floor((done / total) * 100)
             }, abortController.signal)
 
             // merge
             await merge()

        } catch (err: any) {
            if(err.name === 'AbortError' || err.name === 'CanceledError') {
                status.value = UploadStatus.PAUSED
            } else {
                throw err
            }
        }
    }

    async function merge() {
        const merged = await mergeUpload(uploadId.value)
        filePath.value = merged.filePath ?? ""
        status.value = UploadStatus.SUCCESS
        progress.value = 100
    }

    function pause() {
        if(status.value === UploadStatus.UPLOADING) {
            abortController?.abort()
            // 状态会在 catch 块里变成 PAUSED
        }
    }

    function resume() {
        if(status.value === UploadStatus.PAUSED && currentFile) {
            uploadLogic()
        }
    }

    function reset() {
        status.value = UploadStatus.IDLE
        progress.value = 0
        filePath.value = ""
        uploadId.value = ""
        abortController?.abort()
        abortController = null
    }
 
    return {
        status, // 暴露 status 替代 uploading boolean
        progress,
        uploadId,
        filePath,
        start,
        pause,
        resume,
        reset
    }
}