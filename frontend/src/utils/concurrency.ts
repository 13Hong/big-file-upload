export async function runWithConcurrency<T>(
    tasks: Array<() => Promise<T>>,
    limit: number,
    onProgress?: (done: number,total: number) => void
) {
    const total = tasks.length
    let done = 0
    const results:T[] = new Array(total)

    let next = 0
    const workers = new Array(Math.min(limit,total)).fill(0).map(async () => {
        while(true) {
            const cur = next++
            if(cur >= total) return
            results[cur] = await tasks[cur]!();
            done++
            onProgress?.(done,total)
        }
    })

    await Promise.all(workers)
    return results
}