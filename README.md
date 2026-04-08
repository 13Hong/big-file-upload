# 大文件分片上传 Demo

> 一个用于学习大文件上传核心技术的全栈 Demo，涵盖分片上传、MD5 秒传判断、断点续传、并发控制等功能。

## 技术栈

| 端   | 技术                                    |
| ---- | --------------------------------------- |
| 前端 | Vue 3 + TypeScript + Vite + Axios       |
| 后端 | Node.js + Express + TypeScript + Multer |

---

## 核心思路

### 为什么要分片上传？

浏览器直接上传大文件（如几百 MB）存在以下问题：

- 网络波动容易导致整个请求超时或失败，必须从头再来
- 无法显示上传进度
- 服务器内存压力大

**分片上传**的思路是：把大文件切成多个小块（chunk），逐个或并发上传，最后由服务端合并成原始文件。这样即使中途失败，也只需重传失败的那几片，而不是整个文件。

---

### 整体流程

```
前端                                          后端
 │
 │  1. 用户选择文件
 │  2. Web Worker 计算文件 MD5 (uploadId)
 │  3. POST /upload/init  ─────────────────►  创建 tmp 目录，写入 meta.json
 │  4. GET  /upload/status ────────────────►  返回已上传的分片索引列表
 │  5. 过滤出未上传的分片
 │  6. 并发上传各分片
 │     POST /upload/chunk (×N) ───────────►  将分片写入 storage/tmp/{uploadId}/
 │  7. POST /upload/merge  ────────────────►  按顺序合并所有分片到 storage/files/
 │                                            返回最终文件路径
 └─ 上传完成 ✅
```

---

### 各阶段详解

#### 第一步：计算文件 MD5（秒传 / 唯一 ID）

前端使用 **Web Worker** 在后台线程对文件进行分块迭代，计算出整个文件的 MD5 哈希值作为 `uploadId`。

- 在 Worker 中计算，**不阻塞主线程 UI**
- MD5 相同 → 同一个文件，可以实现「秒传」或「断点续传」

#### 第二步：初始化上传（`/upload/init`）

前端把文件名、文件大小、分片大小、总分片数等元信息发给后端。

后端在 `storage/tmp/{uploadId}/` 目录下写入一个 `meta.json`，记录本次上传任务的基本信息。如果该目录已存在（断点续传重新连接），则不覆盖 meta，保持幂等。

#### 第三步：查询已上传分片（`/upload/status`）—— 断点续传关键

前端请求后端，获取当前 `uploadId` 已经上传成功的分片索引列表。

前端拿到列表后，过滤掉这些已完成的分片，**只上传剩余的分片**，从而实现断点续传。

#### 第四步：并发分片上传（`/upload/chunk`）

每个分片以 `FormData` 形式（包含 `uploadId`、`index`、`chunk` 文件）发送到后端。

- 前端使用自定义的 `runWithConcurrency` 工具，控制同时进行的请求数（默认 4 个并发），避免同时发起几十个请求把浏览器/服务器打崩。
- 每个分片请求都绑定同一个 `AbortSignal`，暂停时统一中止所有进行中的请求。
- 后端收到分片后直接写入磁盘 `storage/tmp/{uploadId}/chunk-{index}.part`，**幂等处理**：文件已存在则跳过，防止重复上传导致数据损坏。

#### 第五步：合并分片（`/upload/merge`）

所有分片上传完毕后，前端发送合并请求。

后端读取 `meta.json`，校验分片是否齐全，然后**按索引顺序**依次将各 `chunk-N.part` 追加写入到最终文件 `storage/files/{uploadId}_{fileName}`，完成后返回文件路径。

---

### 暂停 / 继续

| 操作     | 原理                                                                     |
| -------- | ------------------------------------------------------------------------ |
| **暂停** | 调用 `AbortController.abort()`，中止所有进行中的 HTTP 请求               |
| **继续** | 重新走一遍「查询已上传分片 → 过滤 → 上传剩余」流程，已上传的分片自动跳过 |

---

### 状态机

前端用一个 `status` ref 管理上传的全生命周期：

```
IDLE → HASHING → UPLOADING → SUCCESS
                    ↕
                  PAUSED
                (任意状态) → ERROR
```

---

## 项目结构

```
big-file-upload-study/
├── frontend/               # Vue 3 前端
│   └── src/
│       ├── api/
│       │   └── upload.ts       # HTTP 请求封装（init / status / chunk / merge）
│       ├── composables/
│       │   └── useChunkUpload.ts # 核心上传逻辑（状态管理、暂停、续传）
│       ├── utils/
│       │   ├── chunk.ts          # 文件切片工具
│       │   ├── fileHash.ts       # 调用 Worker 计算 MD5
│       │   └── concurrency.ts    # 并发控制工具
│       ├── workers/
│       │   └── hash.worker.ts    # Web Worker：计算文件 MD5
│       └── views/
│           └── UploadDemo.vue    # 上传 UI 页面
│
└── backend/                # Express 后端
    └── src/
        ├── app.ts              # 入口，挂载路由
        ├── routes/
        │   └── upload.routes.ts # 路由定义
        ├── controllers/
        │   └── upload.controller.ts # 请求参数校验与响应
        ├── services/
        │   └── upload.service.ts    # 核心业务逻辑（写分片、合并）
        └── utils/
            └── path.ts              # 路径工具函数
```

---

## 本地运行

### 前置条件

- Node.js >= 18

### 1. 创建后端存储目录

> ⚠️ `storage/` 目录未包含在 Git 仓库中，**必须手动创建**，否则后端无法保存分片和合并文件。

```bash
mkdir -p backend/storage/tmp
mkdir -p backend/storage/files
```

### 2. 启动后端

```bash
cd backend
npm install
npm run dev
```

后端默认运行在 `http://localhost:3000`

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`

### 4. 打开浏览器

访问 `http://localhost:5173`，选择一个大文件体验上传流程。

---

## API 接口一览

| 方法   | 路径             | 说明                               |
| ------ | ---------------- | ---------------------------------- |
| `POST` | `/upload/init`   | 初始化上传任务，创建 meta.json     |
| `GET`  | `/upload/status` | 查询已上传的分片索引（断点续传用） |
| `POST` | `/upload/chunk`  | 上传单个分片                       |
| `POST` | `/upload/merge`  | 合并所有分片为完整文件             |

---

## 学习要点

- **Web Worker**：CPU 密集型的 MD5 计算放到独立线程，避免 UI 卡顿
- **分片切割**：`File.slice()` 按固定大小切割文件为 `Blob`
- **幂等设计**：`init` 和 `chunk` 接口重复调用不会产生副作用
- **断点续传**：通过 `uploadId`（MD5）+ 已上传分片列表实现
- **并发控制**：自实现 `runWithConcurrency` 限制同时并发数
- **AbortController**：统一管理多个请求的取消，实现暂停功能
