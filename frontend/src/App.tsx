import { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

// A korábbi projektnél használt Client ID
const GOOGLE_CLIENT_ID = "197361744572-ih728hq5jft3fqfd1esvktvrd8i97kcp.apps.googleusercontent.com";

function App() {
  const [user, setUser] = useState<any>(null);

  const handleLoginSuccess = (credential: string) => {
    try {
      const decoded: any = jwtDecode(credential);
      setUser(decoded);
      // Később ide jöhet a localStorage mentés és a backend /login-sync hívás
    } catch (error) {
      console.error("Hiba a bejelentkezés során", error);
    }
  };

  const handleLogout = () => {
    googleLogout();
    setUser(null);
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        fontFamily: 'Inter, sans-serif',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* FEJLÉC */}
        <header style={{
          padding: '1.5rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155'
        }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#38bdf8' }}>📸 PhotoContest</h1>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '0.9rem' }}>Szia, {user.given_name}!</span>
              <img src={user.picture} alt="Profil" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
              <button 
                onClick={handleLogout}
                style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Kijelentkezés
              </button>
            </div>
          )}
        </header>

        {/* FŐ TARTALOM */}
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          {!user ? (
            <div style={{ textAlign: 'center', maxWidth: '600px', backgroundColor: '#1e293b', padding: '3rem', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
              <h2 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0' }}>Üdvözlünk a Fotópályázaton!</h2>
              <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>
                Töltsd fel a legjobb pillanataidat, versenyezz más fotósokkal, és nyerd meg a közönségdíjat. A belépéshez használd a Google fiókodat.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin 
                  onSuccess={(res) => handleLoginSuccess(res.credential!)} 
                  onError={() => alert('Sikertelen bejelentkezés!')}
                />
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '2rem', color: '#10b981' }}>Sikeres bejelentkezés! 🎉</h2>
              <p style={{ color: '#94a3b8' }}>Hamarosan itt találod a fotóidat és a feltöltési lehetőséget.</p>
            </div>
          )}
        </main>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
