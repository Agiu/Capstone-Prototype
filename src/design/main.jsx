import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// design.html sets <html data-redesign> itself, so the tokens (scoped to it)
// always apply here without touching the launcher's saved toggle.
import './tokens.js'
import './imageReveal.js'
import '../index.css'
import './page.css'
import DesignSystemPage from './DesignSystemPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DesignSystemPage />
  </StrictMode>,
)
