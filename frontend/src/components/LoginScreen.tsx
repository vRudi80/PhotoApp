return (
  <div style={{
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    position: 'relative', 
    backgroundColor: '#0f172a', // Tiszta, gyors sötét háttér Unsplash nélkül
    fontFamily: 'Inter, sans-serif', 
    padding: '2rem'
  }}>
    
    {/* NYELVVÁLASZTÓ A JOBB FELSŐ SAROKBAN */}
    <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
      {/* ... a nyelvválasztó gombok kódja változatlan ... */}
    </div>

    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem', maxWidth: '1200px', width: '100%', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
      
      {/* BAL OLDAL: Bemutatkozás és Funkciók */}
      <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <img 
          src={currentLogo} 
          alt="PhotAwesome" 
          style={{ width: '100%', maxWidth: '240px', marginBottom: '1rem' }} // Tiszta logó nehéz SVG matrix filter nélkül!
        />
        {/* ... a többi szöveges rész és a Bento-rács változatlan ... */}
      </div>

      {/* JOBB OLDAL: Belépés Panel */}
      <div style={{ flex: '1 1 350px', maxWidth: '420px', width: '100%' }}>
        <div style={{
          background: '#1e293b', // Fix háttér elmosás nélkül
          padding: '3.5rem 2.5rem', 
          borderRadius: '24px', 
          border: '1px solid #334155', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          textAlign: 'center', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center'
        }}>
          {/* ... a GoogleLogin gombod kódja ... */}
          <GoogleLogin onSuccess={(res) => onLoginSuccess(res.credential!)} />
        </div>
      </div>

    </div>
  </div>
);
