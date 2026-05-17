import { BACKEND_URL } from '../utils/constants';

export default function PremiumPaywall({ user }: { user: any }) {
  const handleSubscribe = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user?.email })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Hiba a fizetés indításakor.");
      }
    } catch (error) {
      alert("Hálózati hiba történt az átirányításnál. 🔄");
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '50px auto', padding: '30px', backgroundColor: '#1e293b', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', color: 'white', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '10px' }}>👑</div>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '15px', color: '#f8fafc' }}>Prémium Funkció</h2>
      <p style={{ color: '#cbd5e1', marginBottom: '25px', lineHeight: '1.6' }}>
        Ennek az oldalnak a használatához (Nemzetközi Szalonok és FIAP/PSA statisztikák) Prémium tagság szükséges.
      </p>

      {/* ÁR KIÍRÁSA */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981' }}>
          1.000 Ft <span style={{ fontSize: '1.2rem', color: '#94a3b8', fontWeight: 'normal' }}>/ hónap</span>
        </div>
        <div style={{ color: '#f59e0b', fontWeight: 'bold', marginTop: '5px', fontSize: '1.1rem' }}>
          🎁 Az első 7 nap teljesen ingyenes!
        </div>
      </div>

      {/* FIZETÉS GOMB */}
      <button 
        onClick={handleSubscribe} 
        style={{ width: '100%', background: 'linear-gradient(to right, #6366f1, #8b5cf6)', color: 'white', border: 'none', padding: '15px 20px', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)', transition: 'transform 0.2s' }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        🔓 7 Napos Ingyenes Próba Indítása
      </button>
      
      <div style={{ textAlign: 'center', marginTop: '15px', color: '#64748b', fontSize: '0.85rem' }}>
        A kártyádat most nem terheljük meg. Bármikor lemondható az ingyenes időszak alatt is.
      </div>
    </div>
  );
}
