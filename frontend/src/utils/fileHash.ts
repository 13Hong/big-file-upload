import SparkMD5 from "spark-md5"

/**
 * 计算文件 MD5 （用来做 uploadId）
 * 为了不卡 UI，这里按分片读取（不是一次性读全文件）
 */
export async function calcFileMD5(file: File, chunkSize = 2 * 1024 * 1024) {
    const spark = new SparkMD5.ArrayBuffer()
    const total = Math.ceil(file.size / chunkSize)

    for(let i = 0; i < total;i++) {
        const start = i * chunkSize
        const end = Math.min(start + chunkSize,file.size)
        const buf = await file.slice(start,end).arrayBuffer()
        spark.append(buf)
    }

    return spark.end()
}