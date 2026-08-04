import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { AppProvider } from './state'
import { installMockFetch } from './mock'
import './theme.css'

installMockFetch() // dev + VITE_MOCK=1 เท่านั้น — build จริงเป็น no-op แล้วถูกตัดทิ้ง

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
)
