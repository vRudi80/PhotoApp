import { GoogleLogin } from '@react-oauth/google';
import logo from '../logo.png'; // Ügyelj az útvonalra!

interface LoginScreenProps {
  onLoginSuccess: (credential: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: '#0f172a',
      backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.98)), url("https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=2070&auto=format&fit=crop")',
      backgroundSize: 'cover', backgroundPosition: 'center', fontFamily: 'Inter, sans-serif', overflow: 'hidden', padding: '2rem 1rem'
    }}>
      <div style={{ position: 'absolute', top: '10%', left: '15%', width: '400px', height: '400px', background: '#00a693', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '400px', height: '400px', background: '#d32f2f', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%' }}></div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem', maxWidth: '1100px', width: '100%', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
          <img src={logo} alt="Képolvasók Fotóklub" style={{ width: '100%', maxWidth: '220px', marginBottom: '1rem', filter: 'drop-shadow(0px 0px 10px rgba(255,255,255,0.3))' }} />
          <h1 style={{ fontSize: '2.5rem', margin: 0, color: '#f8fafc', lineHeight: '1.2', fontWeight: 800 }}>Fotóklub és Fotópályázat <br/><span style={{ background: 'linear-gradient(to right, #38bdf8, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Kezelő Rendszer</span></h1>
          <p style={{ fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '1rem', lineHeight: '1.6' }}>Minden egy helyen: szervezd a fotóklubod eseményeit, indíts házi feladatokat és bonyolíts le profi fotópályázatokat egyszerűen.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', transition: 'transform 0.2s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform='translateX(10px)'} onMouseOut={e => e.currentTarget.style.transform='none'}>
              <div style={{ fontSize: '2.5rem' }}>📅</div>
              <div><h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.2rem' }}>Aktív Klubélet</h3><p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5' }}>Szervezz klubesteket, oszd meg a helyszíneket és írj ki házi feladatokat a tagoknak.</p></div>
            </div>
            <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', transition: 'transform 0.2s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform='translateX(10px)'} onMouseOut={e => e.currentTarget.style.transform='none'}>
              <div style={{ fontSize: '2.5rem' }}>🏆</div>
              <div><h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.2rem' }}>Profi Pályázatkezelés</h3><p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5' }}>Hozz létre zártkörű vagy nyílt versenyeket, és fogadd a nevezéseket kategóriánként.</p></div>
            </div>
            <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', transition: 'transform 0.2s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform='translateX(10px)'} onMouseOut={e => e.currentTarget.style.transform='none'}>
              <div style={{ fontSize: '2.5rem' }}>⚖️</div>
              <div><h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.2rem' }}>Objektív Zsűrizés</h3><p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5' }}>Vond be a zsűritagokat a kényelmes pontozási felületen, és fedezd fel a végeredményt.</p></div>
            </div>
          </div>
        </div>
        <div style={{ flex: '1 1 350px', maxWidth: '450px', width: '100%' }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            padding: '3rem 2.5rem', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#f8fafc', fontWeight: '800' }}>Lépj be és Csatlakozz!</h2>
            <p style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '2.5rem', lineHeight: '1.6' }}>A belépéshez nincs szükség külön regisztrációra, csak használd a meglévő Google fiókodat biztonságosan.</p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
              <div style={{ padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <GoogleLogin onSuccess={(res) => onLoginSuccess(res.credential!)} shape="pill" size="large" theme="filled_black" text="continue_with" />
              </div>
              <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>Biztonságos belépés Google fiókkal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
