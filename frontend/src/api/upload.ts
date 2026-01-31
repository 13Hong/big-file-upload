import axios from "axios"

const http = axios.create({
    baseURL:import.meta.env.VITE_API_BASE,
    timeout:60_000
})

export type InitPayload = {
    uploadId: string;
    fileName: string;
    fileSize: number;
    chunkSize: number;
    totalChunks: number
}

export function testHealth(){
    return http.get("/health")
}

export async function initUpload(payload: InitPayload) {
    return http.post("/upload/init",payload)
}

export async function getUploadStatus(uploadId: string) {
    const res = await http.get<{ ok:boolean; uploaded: number[]}>("/upload/status",{ params:{ uploadId } })
    return res.data
}

export async function uploadChunk(form: FormData) {
    return http.post("/upload/chunk",form, {
        headers:{ "Content-Type": "multipart/form-data" }
    })
}

export async function mergeUpload(uploadId: string) {
    const res = await http.post<{ ok:boolean; filePath?: string }>("/upload/merge",{ uploadId })
    return res.data
}