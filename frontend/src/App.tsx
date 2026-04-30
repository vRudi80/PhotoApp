import { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

const GOOGLE_CLIENT_ID = "197361744572-ih728hq5jft3fqfd1esvktvrd8i97kcp.apps.googleusercontent.com";
// Cseréld le a Vercel/Render URL-edre!
const BACKEND_URL = "https://ideas-backend-8v5u.onrender.com"; 
const ADMIN_EMAIL = "kovari.rudolf@gmail.com"; // A te e-mail címed

function App() {
  const [user, setUser] = useState<any>(null);
  const [contests, setContests] = useState<any[]>([]);
  
  // Admin form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Adatok lekérése
  const fetchContests = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/contests`);
      if (res.ok) setContests(await res.json());
    } catch (e) { console.error("Hiba a pályázatok lekérésekor", e); }
  };

  useEffect(() => {
    fetchContests();
  }, []);

  const handleLoginSuccess = (credential: string) => {
    try {
      const decoded: any = jwtDecode(credential);
      setUser(decoded);
    } catch (error) { console.error("Hiba", error); }
  };

  // Pályázat létrehozása
  const handleCreateContest = async () => {
    if (!newTitle) return alert("Adj címet a pályázatnak!");
    const res = await fetch(`${BACKEND_URL}/api/contests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, description: newDesc })
    });
    if (res.ok) {
      setNewTitle(''); setNewDesc('');
      fetchContests();
    }
  };

  // Kép feltöltése (Szimulált hívás)
  const handleUpload = async (contestId: number, file: File | null) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('contestId', String(contestId));
    formData.append('userEmail', user.email);
    formData.append('userName', user.name);

    const res = await fetch(`${BACKEND_URL}/api/upload`, {
      method: 'POST',
      body: formData // Itt nem kell Content-Type header, a fetch automatikusan beállítja a FormData miatt!
    });
    
    if (res.ok) alert("Kép sikeresen feltöltve!");
    else alert("Hiba történt!");
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
        
        <header style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#38bdf8' }}>📸 PhotoContest</h1>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span>{user.name} {user.email === ADMIN_EMAIL && <span style={{background: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem'}}>ADMIN</span>}</span>
              <button onClick={() => { googleLogout(); setUser(null); }} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Kijelentkezés</button>
            </div>
          ) : (
            <GoogleLogin onSuccess={(res) => handleLoginSuccess(res.credential!)} />
          )}
        </header>

        <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          {!user ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <h2>Jelentkezz be a pályázatok megtekintéséhez és a nevezéshez!</h2>
            </div>
          ) : (
            <>
              {/* ADMIN SZEKCIÓ */}
              {user.email === ADMIN_EMAIL && (
                <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #38bdf8' }}>
                  <h3 style={{ marginTop: 0, color: '#38bdf8' }}>⚙️ Admin: Új Pályázat Létrehozása</h3>
                  <input placeholder="Pályázat címe" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px' }} />
                  <textarea placeholder="Leírás / Szabályok" value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', minHeight: '80px' }} />
                  <button onClick={handleCreateContest} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Létrehozás</button>
                </div>
              )}

              {/* PÁLYÁZATOK LISTÁJA (Mindenkinek) */}
              <h2>Aktuális Fotópályázatok</h2>
              {contests.length === 0 ? <p style={{ color: '#94a3b8' }}>Jelenleg nincs aktív pályázat.</p> : contests.map(contest => (
                <div key={contest.id} style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', marginBottom: '1rem' }}>
                  <h3 style={{ margin: '0 0 10px 0' }}>{contest.title}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '15px' }}>{contest.description}</p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0f172a', padding: '10px', borderRadius: '8px' }}>
                    <input type="file" accept="image/*" id={`file-${contest.id}`} style={{ color: '#94a3b8', fontSize: '0.8rem' }} />
                    <button 
                      onClick={() => {
                        const fileInput = document.getElementById(`file-${contest.id}`) as HTMLInputElement;
                        handleUpload(contest.id, fileInput?.files?.[0] || null);
                      }}
                      style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginLeft: 'auto' }}>
                      Kép Beküldése 🚀
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </main>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
