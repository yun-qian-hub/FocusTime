import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/styles/main.css'
import { createPersistedStatePlugin } from './plugins/persistedState'
import { useAlarmStore } from './stores/alarm'

const app = createApp(App)
const pinia = createPinia()

pinia.use(createPersistedStatePlugin())

app.use(pinia)
app.mount('#app')

const alarmStore = useAlarmStore()
alarmStore.startBackgroundTimer()