export type ChunkItem = {
    index: number;
    blob: Blob;
}

export function createChunks(file: File,chunkSize: number):ChunkItem[] {
    const chunks: ChunkItem[] = []
    let index = 0
    for(let start = 0; start < file.size; start += chunkSize ) {
        const end = Math.min(start + chunkSize, file.size)
        chunks.push({ index, blob: file.slice(start,end) })
        index++
    }
    return chunks
}