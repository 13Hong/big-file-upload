export async function runWithConcurrency<T>(
    tasks: Array<() => Promise<T>>,
    limit: number,
    onProgress?: (done: number,total: number) => void,
    signal?: AbortSignal
) {
    const total = tasks.length
    let done = 0
    const results:T[] = new Array(total)

    let next = 0

    // 抛出错误以中断 Promise.all
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const workers = new Array(Math.min(limit,total)).fill(0).map(async () => {
        while(next < total) {
            if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
            
            const cur = next++
            results[cur] = await tasks[cur]!(); // 任务本身如果不传 signal，至少这里不会发起新的
            
            done++
            onProgress?.(done,total)
        }
    })

    await Promise.all(workers)
    return results
}