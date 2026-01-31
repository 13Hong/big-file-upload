<script setup lang="ts">
import { ref } from "vue";
import { useChunkUpload } from "../composables/useChunkUpload";
import { testHealth } from "../api/upload";

const fileRef = ref<File | null>(null);
const { uploading, progress, uploadId, filePath, start } = useChunkUpload();

function onPick(e: Event) {
  const input = e.target as HTMLInputElement;
  fileRef.value = input.files?.[0] ?? null;
}

async function onUpload() {
  if (!fileRef.value) return;
  await start(fileRef.value);
}
</script>

<template>
  <div style="max-width: 720px; margin: 40px auto; font-family: system-ui;">
    <h2>Big File Upload (Chunk + Resume)</h2>

    <input type="file" @change="onPick" />
    <button :disabled="!fileRef || uploading" @click="onUpload" style="margin-left: 12px;">
      {{ uploading ? "Uploading..." : "Start Upload" }}
    </button>

    <div style="margin-top: 16px;">Progress: {{ progress }}%</div>
    <div style="height: 10px; background: #eee; border-radius: 6px; overflow: hidden;">
      <div :style="{ width: progress + '%', height: '10px', background: '#333' }"></div>
    </div>

    <div style="margin-top: 12px; font-size: 12px; color: #666;">
      uploadId: {{ uploadId }}
    </div>

    <div v-if="filePath" style="margin-top: 12px;">
      Merged filePath (server): {{ filePath }}
    </div>
  </div>
  <div>
    <h1>测试</h1>
    <button @click="testHealth">测试接口</button>
  </div>
</template>
