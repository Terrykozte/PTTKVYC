import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { FriendProvider } from './FriendContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FriendProvider>
      <App />
    </FriendProvider>
  </StrictMode>,
)
