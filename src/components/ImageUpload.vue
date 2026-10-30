<template>
  <div class="image-upload">
    <el-upload
      drag
      action="#"
      :auto-upload="false"
      :show-file-list="true"
      :limit="3"
      accept="image/*"
      :on-change="handleFileChange"
      :on-remove="handleRemove"
      multiple
    >
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">
        点击或拖拽图片到此处，<em>支持JPG/PNG，最多3张</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">系统将自动识别文字内容</div>
      </template>
    </el-upload>

    <div v-if="recognizing" class="recognizing">
      <el-progress :percentage="progress" status="success" />
      <p>AI正在识别作答文字，请稍候…</p>
    </div>

    <el-button v-if="fileList.length > 0 && !recognizing" type="primary" @click="startRecognize" style="margin-top: 15px">
      开始识别文字
    </el-button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { recognizeImage } from '@/api/ocr'

const emit = defineEmits(['ocr-result'])

const fileList = ref([])
const recognizing = ref(false)
const progress = ref(0)

function handleFileChange(file, files) {
  fileList.value = files
}

function handleRemove(file, files) {
  fileList.value = files
}

async function startRecognize() {
  if (fileList.value.length === 0) {
    ElMessage.warning('请先上传图片')
    return
  }

  recognizing.value = true
  progress.value = 0
  let allText = ''

  try {
    for (let i = 0; i < fileList.value.length; i++) {
      const file = fileList.value[i].raw
      progress.value = Math.round(((i + 0.5) / fileList.value.length) * 100)
      const text = await recognizeImage(file)
      allText += text + '\n'
      progress.value = Math.round(((i + 1) / fileList.value.length) * 100)
    }

    emit('ocr-result', allText.trim())
    ElMessage.success('识别完成')
  } catch (e) {
    let msg = e.message || '未知错误'
    if (msg.includes('IMAGE_TOO_LARGE') || msg.includes('413') || msg.includes('EXCEED_MAX') || msg.includes('图片太大')) {
      msg = '图片太大，请裁剪图片或拍近一点后重试'
    } else if (msg.includes('timeout') || msg.includes('超时')) {
      msg = '识别超时，请检查网络后重试'
    } else if (msg.includes('Network') || msg.includes('network') || msg.includes('Network Error')) {
      msg = '网络连接失败，请检查网络后重试'
    } else if (msg.includes('OCR_FAIL')) {
      msg = '文字识别失败，请尝试手动输入或重新拍照'
    }
    ElMessage.error('识别失败：' + msg)
  } finally {
    recognizing.value = false
  }
}
</script>

<style scoped>
.image-upload {
  padding: 10px 0;
}

.recognizing {
  margin-top: 20px;
  text-align: center;
}

.recognizing p {
  margin-top: 10px;
  color: #909399;
}

/* 移动端适配 */
@media (max-width: 768px) {
  :deep(.el-upload-dragger) {
    padding: 15px;
  }

  :deep(.el-upload-dragger .el-icon--upload) {
    font-size: 40px;
    margin-bottom: 5px;
  }

  :deep(.el-upload__text) {
    font-size: 13px;
  }

  :deep(.el-upload-list) {
    font-size: 13px;
  }

  .image-upload :deep(.el-button) {
    width: 100%;
  }
}
</style>
