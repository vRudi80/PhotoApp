import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import logo from '../logo.png'; // Ügyelj az útvonalra!

interface LoginScreenProps {
  onLoginSuccess: (credential: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  
  // A dashboard alapján felépített funkció-lista
  const features = [
    { icon: '🔥', title: 'Heti Párbaj', desc: 'Képes kihívások és toplisták.', color: '#f97316' },
    { icon: '🏆', title: 'FIAP / MAFOSZ', desc: 'Nemzetközi minősítés követő.', color: '#f43f5e' },
    { icon: '🌍', title: 'Fotós Térkép', desc: 'Közösségi helyszín megosztó.', color: '#10b981' },
    { icon: '🖼️', title: 'AI Elemzés', desc: 'Portfólió és okos képelemzés.', color: '#f59e0b' },
    { icon: '👥', title: 'Fotóklub Élet', desc: 'Hírek, klubestek és feladatok.', color: '#06b6d4' },
    { icon: '📝', title: 'Pályázatok', desc: 'Nyílt és zárt fotóversenyek.', color: '#8b5cf6' }
  ];

  return (
    <div style={{
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      position: 'relative', 
      backgroundColor: '#0f172a',
      backgroundImage: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.98) 100%), url("https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=2070&auto=format&fit=crop")',
      backgroundSize: 'cover', 
      backgroundPosition: 'center', 
      backgroundAttachment: 'fixed',
      fontFamily: 'Inter, sans-serif', 
      overflow: 'hidden', 
      padding: '2rem'
    }}>
      
      {/* Háttér fények */}
      <div className="bg-glow" style={{ position: 'absolute', top: '-10%', left: '-10%', width: '500px', height: '500px', background: '#38bdf8', filter: 'blur(200px)', opacity: 0.15, borderRadius: '50%' }}></div>
      <div className="bg-glow" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '500px', height: '500px', background: '#8b5cf6', filter: 'blur(200px)', opacity: 0.15, borderRadius: '50%' }}></div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem', maxWidth: '1200px', width: '100%', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        
        {/* BAL OLDAL: Bemutatkozás és Funkciók */}
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'slideInLeft 0.8s ease-out' }}>
          
          <img src={logo} alt="Képolvasók Fotóklub" style={{ width: '100%', maxWidth: '240px', marginBottom: '1rem', filter: 'drop-shadow(0px 4px 15px rgba(0,0,0,0.5))' }} />
          
          <h1 style={{ fontSize: '3rem', margin: 0, color: '#f8fafc', lineHeight: '1.1', fontWeight: 800, letterSpacing: '-1px' }}>
            A Fotósok <br/>
            <span style={{ background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Digitális Otthona
            </span>
          </h1>
          
          <p style={{ fontSize: '1.15rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: '1.6', maxWidth: '90%' }}>
            Lépj be a közösségbe! Fedezz fel új helyszíneket, versengj a heti kihívásokban, kövesd a nemzetközi FIAP/MAFOSZ sikereidet és kérj profi AI képelemzést a portfóliódra.
          </p>
          
          {/* Funkciók Bento-Rács */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {features.map((feat, idx) => (
              <div 
                key={idx} 
                className="feature-card"
                style={{ 
                  background: 'rgba(30, 41, 59, 0.4)', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  borderRadius: '16px', 
                  padding: '1rem 1.2rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div style={{ fontSize: '1.8rem', background: `${feat.color}20`, padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {feat.icon}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#f8fafc', fontSize: '1rem' }}>{feat.title}</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem', lineHeight: '1.3' }}>{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* JOBB OLDAL: Belépés Panel */}
        <div style={{ flex: '1 1 350px', maxWidth: '420px', width: '100%', animation: 'slideInRight 0.8s ease-out' }}>
          <div className="login-panel" style={{
            background: 'rgba(15, 23, 42, 0.6)', 
            backdropFilter: 'blur(20px)', 
            WebkitBackdropFilter: 'blur(20px)',
            padding: '3.5rem 2.5rem', 
            borderRadius: '24px', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            position: 'relative'
          }}>
            
            {/* Lebegő badge */}
            <div style={{ position: 'absolute', top: '-15px', background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: 'white', padding: '6px 16px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(249, 115, 22, 0.4)' }}>
              Vártunk már! 📸
            </div>

            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#f8fafc', fontWeight: '800' }}>Lépj be a portálra</h2>
            <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '2.5rem', lineHeight: '1.6' }}>
              A belépéshez nincs szükség külön regisztrációra. Használd a meglévő, biztonságos Google fiókodat!
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
              <div className="google-btn-wrapper" style={{ padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)', transition: 'transform 0.2s', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin 
                  onSuccess={(res) => onLoginSuccess(res.credential!)} 
                  shape="pill" 
                  size="large" 
                  theme="filled_black" 
                  text="continue_with" 
                />
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                🔒 100% Biztonságos Google azonosítás
              </span>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .feature-card:hover {
          transform: translateY(-5px);
          background: rgba(30, 41, 59, 0.8) !important;
          border-color: rgba(255,255,255,0.15) !important;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        .google-btn-wrapper:hover {
          transform: scale(1.02);
          background: rgba(255,255,255,0.1) !important;
        }
        .login-panel {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
