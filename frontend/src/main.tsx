import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css' // Ha van ilyened

const GOOGLE_CLIENT_ID = "A_TE_CLIENT_ID_KÓDOD.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
