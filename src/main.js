import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'//引入路由

const app = createApp(App)
app.use(createPinia())
app.use(router)//提供路由
app.use(ElementPlus)
app.mount('#app')//渲染
