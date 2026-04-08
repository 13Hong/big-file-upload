<script setup lang="ts">
import { ref, computed } from "vue";
import { useChunkUpload, UploadStatus } from "../composables/useChunkUpload";

const fileRef = ref<File | null>(null);
const { status, progress, uploadId, filePath, start, pause, resume, reset } = useChunkUpload();

function onPick(e: Event) {
  const input = e.target as HTMLInputElement;
  if(input.files?.[0]) {
    fileRef.value = input.files[0];
    reset();
  }
}

async function onUpload() {
  if (!fileRef.value) return;
  await start(fileRef.value);
}

const statusText = computed(() => {
    switch(status.value) {
        case UploadStatus.IDLE: return 'Waiting for file...';
        case UploadStatus.HASHING: return 'Calculating MD5 (Worker)...';
        case UploadStatus.UPLOADING: return 'Uploading Chunks...';
        case UploadStatus.PAUSED: return 'Paused';
        case UploadStatus.SUCCESS: return 'Upload Compelte!';
        case UploadStatus.ERROR: return 'Upload Failed';
        default: return ''
    }
})
</script>

<template>
  <div class="aurora-container">
    <!-- Decorative Background Elements -->
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>

    <div class="glass-card">
        <div class="card-header">
            <h2 class="title">Turbo Upload</h2>
            <p class="subtitle">Secure • Resumable • Blazing Fast</p>
        </div>

        <div class="upload-zone" :class="{ 'has-file': !!fileRef }">
            <input type="file" id="fileInput" @change="onPick" class="file-input" />
            <label for="fileInput" class="file-label">
                <template v-if="fileRef">
                    <div class="icon-placeholder">📄</div>
                    <div class="text-content">
                        <h3 class="filename">{{ fileRef.name }}</h3>
                        <p class="filesize">{{ (fileRef.size / 1024 / 1024).toFixed(2) }} MB</p>
                    </div>
                </template>
                <template v-else>
                    <div class="icon-placeholder">📂</div>
                    <div class="text-content">
                        <h3 style="color: #f8fafc;">Drop your massive file here</h3>
                        <p>or click to browse</p>
                    </div>
                </template>
            </label>
            <div class="glow-border"></div>
        </div>

        <div class="action-bar">
             <button 
                class="btn-primary" 
                @click="onUpload" 
                :disabled="!fileRef || status === UploadStatus.UPLOADING || status === UploadStatus.HASHING || status === UploadStatus.PAUSED"
            >
                <span class="btn-text">Start Upload</span>
                <div class="btn-glow"></div>
            </button>
            
            <div class="control-group">
                <button 
                    class="btn-icon warning" 
                    @click="pause" 
                    :disabled="status !== UploadStatus.UPLOADING"
                    title="Pause"
                >
                    ⏸
                </button>
                <button 
                    class="btn-icon success" 
                    @click="resume" 
                    :disabled="status !== UploadStatus.PAUSED"
                    title="Resume"
                >
                    ▶
                </button>
            </div>
        </div>

        <div class="status-section">
            <div class="status-header">
                <span class="status-label">STATUS</span>
                <span class="status-value" :class="status">{{ statusText }}</span>
            </div>
            
            <div class="progress-track">
                <div class="progress-fill" :style="{ width: progress + '%' }">
                    <div class="progress-glow"></div>
                    <div class="progress-shimmer"></div>
                </div>
            </div>
            <div class="percentage">{{ progress }}%</div>
        </div>

        <div class="meta-data" v-if="uploadId">
            <div class="meta-row">
                <span class="meta-label">ID</span>
                <span class="meta-value">{{ uploadId }}</span>
            </div>
            <div class="meta-row" v-if="filePath">
                <span class="meta-label">PATH</span>
                <span class="meta-value highlight">{{ filePath }}</span>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&family=JetBrains+Mono:wght@400;700&display=swap');

:host {
    --bg-dark: #0f172a;
    --glass-surface: rgba(255, 255, 255, 0.05);
    --glass-border: rgba(255, 255, 255, 0.1);
    --accent-primary: #3b82f6;
    --accent-glow: #60a5fa;
    --text-primary: #ffffff;
}

.aurora-container {
    /* 强制全屏覆盖，忽略父级 margin/padding */
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 0;
    
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #020617;
    
    /* 调整渐变范围，使其融合得更自然，不突兀 */
    background-image: 
        radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 70%), 
        radial-gradient(at 50% 10%, hsla(225,39%,25%,1) 0, transparent 70%), 
        radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 70%);
        
    overflow: hidden;
    font-family: 'Outfit', sans-serif;
    color: var(--text-primary);
    perspective: 1000px;
}

/* 酷炫的动态网格背景 */
.aurora-container::before {
    content: '';
    position: absolute;
    width: 200%;
    height: 200%;
    top: -50%;
    left: -50%;
    z-index: -1; /* 确保在内容之下 */
    background-image: 
        linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 60px 60px; /*稍微大一点的网格*/
    transform: rotateX(45deg);
    animation: grid-move 30s linear infinite; /* 减慢速度更优雅 */
    pointer-events: none;
}

@keyframes grid-move {
    0% { transform: translateY(0) rotateX(45deg); }
    100% { transform: translateY(60px) rotateX(45deg); }
}

/* Decorative Orbs */
.orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px); /* 增加模糊度，更梦幻 */
    z-index: 1;
    opacity: 0.4; /* 降低透明度，不抢主体视线 */
    animation: float 15s infinite ease-in-out;
}
.orb-1 {
    width: 600px; /* 变大 */
    height: 600px;
    background: #6d28d9; /* Purple 700 */
    top: -150px;
    left: -150px;
}
.orb-2 {
    width: 500px;
    height: 500px;
    background: #1d4ed8; /* Blue 700 */
    bottom: -100px;
    right: -100px;
    animation-delay: -7s;
}

@keyframes float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(30px, -30px) scale(1.1); }
}

/* Glass Card */
/* Glass Card */
.glass-card {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 480px; /* 稍微窄一点，更精致 */
    
    /* 更加 clean 的玻璃质感：深色背景上稍微亮一点，或者保持深色但透明度高 */
    background: rgba(30, 41, 59, 0.7); 
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    
    /* 发光边框 */
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-top: 1px solid rgba(255, 255, 255, 0.15); /* 顶部稍微亮一点模拟反光 */
    
    border-radius: 24px;
    padding: 40px;
    
    /* 强烈的悬浮阴影 */
    box-shadow: 
        0 0 0 1px rgba(0, 0, 0, 0.05),
        0 20px 50px -10px rgba(0, 0, 0, 0.6);
        
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* 鼠标悬停时的微互动：稍微上浮 */
.glass-card:hover {
    transform: translateY(-5px) scale(1.01);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 
        0 0 0 1px rgba(255, 255, 255, 0.1),
        0 30px 60px -12px rgba(0, 0, 0, 0.7);
}

.title {
    font-size: 32px;
    font-weight: 700;
    background: linear-gradient(to right, #fff, #94a3b8);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin: 0;
    letter-spacing: -1px;
}

.subtitle {
    color: #f8fafc;
    font-size: 14px;
    margin-top: 8px;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 500;
}

/* Upload Zone */
.upload-zone {
    margin: 32px 0;
    position: relative;
}

.file-input { display: none; }

.file-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 160px;
    background: rgba(255,255,255,0.03);
    border: 2px dashed rgba(255,255,255,0.1);
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.upload-zone.has-file .file-label {
    background: rgba(37, 99, 235, 0.1);
    border-color: #3b82f6;
    border-style: solid;
}

.file-label:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.3);
}

.icon-placeholder {
    font-size: 32px;
    margin-bottom: 12px;
}

.text-content h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
}

.text-content p {
    margin: 4px 0 0;
    color: #f8fafc;
    font-size: 13px;
}

/* Actions */
.action-bar {
    display: flex;
    gap: 16px;
    margin-bottom: 32px;
}

.btn-primary {
    flex: 2;
    position: relative;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    border: none;
    border-radius: 12px;
    height: 50px;
    color: white;
    font-weight: 700;
    font-size: 16px;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.2s;
}

.btn-primary:disabled {
    filter: grayscale(1);
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
}

.control-group {
    display: flex;
    gap: 8px;
    flex: 1;
}

.btn-icon {
    flex: 1;
    border: 1px solid var(--glass-border);
    background: rgba(255,255,255,0.05);
    color: white;
    border-radius: 12px;
    cursor: pointer;
    font-size: 18px;
    transition: all 0.2s;
}
.btn-icon:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
.btn-icon:disabled { opacity: 0.3; cursor: not-allowed; }

/* Status & Progress */
.status-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
}

.status-label { color: #f8fafc; }

.status-value { color: white; }
.status-value.hashing { color: #facc15; }
.status-value.uploading { color: #60a5fa; }
.status-value.success { color: #4ade80; }

.progress-track {
    height: 8px;
    background: rgba(255,255,255,0.1);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
}

.progress-fill {
    height: 100%;
    background: #3b82f6;
    position: relative;
    transition: width 0.3s ease;
}

.progress-glow {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 20px;
    background: white;
    filter: blur(5px);
    opacity: 0.5;
}

.percentage {
    text-align: right;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #f8fafc;
}

/* Meta Data */
.meta-data {
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid var(--glass-border);
}

.meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 8px;
}

.meta-label {
    color: #f8fafc;
    font-weight: 700;
}

.meta-value {
    font-family: 'JetBrains Mono', monospace;
    opacity: 0.8;
}

.highlight {
    color: #4ade80;
}
</style>
