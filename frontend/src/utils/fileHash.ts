import Worker from "../workers/hash.worker.ts?worker"

/**
 * 计算文件 MD5 （Web Worker 版）
 * 不卡顿主线程
 */
export function calcFileMD5(file: File, chunkSize = 2 * 1024 * 1024): Promise<string> {
    return new Promise((resolve,reject) => {
        // Vite 导入 worker 的方式
        const worker = new Worker()
        
        worker.postMessage({ file, chunkSize })

        worker.onmessage = (e) => {
            const { hash, error } = e.data
            if(hash) {
                resolve(hash)
                worker.terminate()
            } else {
                reject(error)
                worker.terminate()
            }
        }

        worker.onerror = (err) => {
            reject(err)
            worker.terminate()
        }
    })
}