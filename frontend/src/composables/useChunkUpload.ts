import { ref } from "vue"
import { createChunks } from "../utils/chunk"
import { calcFileMD5 } from "../utils/fileHash"
import { runWithConcurrency } from "../utils/concurrency"
import { initUpload,getUploadStatus,uploadChunk,mergeUpload } from "../api/upload"

export function useChunkUpload(){
    const uploading = ref(false)
    const progress = ref(0)
    const uploadId = ref<string>("")
    const filePath = ref<string>("")

    const chunkSize = 5 * 1024 * 1024
    const concurrency = 4

    async function start(file:File) {
        uploading.value = true
        progress.value = 0
        filePath.value = ""

        try {
            // 生成 uploadId
            uploadId.value = await calcFileMD5(file)

            // 切片
            const chunks = createChunks(file,chunkSize)
            const totalChunks = chunks.length

            // init
            await initUpload({
                uploadId: uploadId.value,
                fileName: file.name,
                fileSize: file.size,
                chunkSize,
                totalChunks
            })

            // status (断电续传：跳过已上传)
            const status = await getUploadStatus(uploadId.value)
            const uploadedSet = new Set(status.uploaded ?? [])
            
            const needUpload = chunks.filter((c) => !uploadedSet.has(c.index))

            // 进度：已完成 + 本次完成
            const baseDone = uploadedSet.size
            const total = totalChunks

            const tasks = needUpload.map((c) => async () => {
                const form = new FormData()
                form.append("uploadId", uploadId.value)
                form.append("index", String(c.index))
                form.append("chunk",c.blob,`chunk-${c.index}.part`) // 字段名称 chunk-xxx.part
                await uploadChunk(form)
            })

            // 并发上传 + 进度更新
            await runWithConcurrency(tasks,concurrency,(doneNow) => {
                const done = baseDone + doneNow
                progress.value = Math.floor((done / total) * 100)
            })

            // merge
            const merged = await mergeUpload(uploadId.value)
            filePath.value = merged.filePath ?? ""
            progress.value = 100


        } finally {
            uploading.value = false
        }
    }

    return {
        uploading,
        progress,
        uploadId,
        filePath,
        start
    }
}