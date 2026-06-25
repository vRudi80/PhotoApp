module.exports = function(app, pool, checkPremium, genAI, xlsx, cheerio, upload, cleanupTempFile) {

  // ALAPADATOK
  app.get('/api/countries', async (req, res) => { try { const [rows] = await pool.query('SELECT id, country, country_hun, country_code FROM photo_countries WHERE is_active = 1 ORDER BY country_hun ASC'); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); } });
  app.get('/api/categories', async (req, res) => { try { const [rows] = await pool.query('SELECT * FROM photo_categories ORDER BY hun_name ASC'); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); } });
  app.post('/api/categories', async (req, res) => { try { await pool.query('INSERT INTO photo_categories (name, hun_name) VALUES (?, ?)', [req.body.name, req.body.hunName]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); } });
  app.put('/api/categories/:id', async (req, res) => { try { await pool.query('UPDATE photo_categories SET name = ?, hun_name = ? WHERE id = ?', [req.body.name, req.body.hunName, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); } });
  app.delete('/api/categories/:id', async (req, res) => { try { await pool.query('DELETE FROM photo_categories WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); } });
  app.get('/api/patrons', async (req, res) => { try { const [rows] = await pool.query('SELECT * FROM photo_patrons ORDER BY name ASC'); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); } });

  app.get('/api/awards', async (req, res) => { try { const [rows] = await pool.query('SELECT * FROM photo_awards ORDER BY id ASC'); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba' }); } });
  app.post('/api/awards', async (req, res) => { try { const [[{ nextId }]] = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 as nextId FROM photo_awards'); await pool.query('INSERT INTO photo_awards (id, award_name) VALUES (?, ?)', [nextId, req.body.awardName]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); } });
  app.put('/api/awards/:id', async (req, res) => { try { await pool.query('UPDATE photo_awards SET award_name = ? WHERE id = ?', [req.body.awardName, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); } });
  app.delete('/api/awards/:id', async (req, res) => { try { await pool.query('DELETE FROM photo_awards WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); } });

  // SZALONOK
  app.get('/api/salons', async (req, res) => {
    try {
      const [salons] = await pool.query(`SELECT s.*, c.country_hun, c.country_code FROM photo_salons s LEFT JOIN photo_countries c ON s.host_country_id = c.id ORDER BY s.end_date DESC`);
      const [patrons] = await pool.query(`SELECT sp.salon_id, p.name, sp.patron_number FROM photo_salon_patrons sp JOIN photo_patrons p ON sp.patron_id = p.id`);
      const [categories] = await pool.query(`SELECT sc.salon_id, cat.hun_name, cat.name FROM photo_salon_categories sc JOIN photo_categories cat ON sc.category_id = cat.id`);
      
      const patronMap = {}; patrons.forEach(p => { if (!patronMap[p.salon_id]) patronMap[p.salon_id] = []; patronMap[p.salon_id].push({ name: p.name, number: p.patron_number }); });
      const categoryMap = {}; categories.forEach(c => { if (!categoryMap[c.salon_id]) categoryMap[c.salon_id] = []; categoryMap[c.salon_id].push(c.hun_name || c.name); });
      const formattedSalons = salons.map(salon => ({ ...salon, patron_details: patronMap[salon.id] || [], categories: categoryMap[salon.id] || [] }));
      res.json(formattedSalons);
    } catch(err) { res.status(500).json({error: err.message}); }
  });

  app.post('/api/salons', async (req, res) => {
    const { name, feeAmount, feeCurrency, startDate, endDate, website, resultsDate, isCircuit, awardsCount, cashPrize, circuitNumber, submissionType, hostCountryId, patronsData, categoryIds } = req.body;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      if (patronsData && patronsData.length > 0) {
        const numbersToCheck = patronsData.map(p => p.number).filter(n => n && n.trim() !== '');
        if (numbersToCheck.length > 0) {
          const [existing] = await conn.query('SELECT patron_number FROM photo_salon_patrons WHERE patron_number IN (?)', [numbersToCheck]);
          if (existing.length > 0) { await conn.rollback(); return res.status(400).json({ error: `Ezzel az azonosítóval (${existing[0].patron_number}) már létezik szalon!` }); }
        }
      }
      const [result] = await conn.query('INSERT INTO photo_salons (name, fee_amount, fee_currency, start_date, end_date, website, results_date, is_circuit, awards_count, cash_prize, circuit_number, submission_type, host_country_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [name, feeAmount || null, feeCurrency || 'EUR', startDate || null, endDate, website || null, resultsDate || null, isCircuit ? 1 : 0, awardsCount || 0, cashPrize || null, circuitNumber || null, submissionType || 'online', hostCountryId || null]);
      const salonId = result.insertId;
      if (patronsData && patronsData.length > 0) {
        const pValues = patronsData.map(p => [salonId, p.id, p.number || null]);
        await conn.query('INSERT INTO photo_salon_patrons (salon_id, patron_id, patron_number) VALUES ?', [pValues]);
      }
      if (categoryIds && categoryIds.length > 0) {
        const cValues = categoryIds.map(id => [salonId, id]);
        await conn.query('INSERT INTO photo_salon_categories (salon_id, category_id) VALUES ?', [cValues]);
      }
      await conn.commit(); res.json({ success: true });
    } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); } finally { conn.release(); }
  });

  app.put('/api/salons/:id', async (req, res) => {
    const { name, feeAmount, feeCurrency, startDate, endDate, website, resultsDate, isCircuit, awardsCount, cashPrize, circuitNumber, submissionType, hostCountryId, patronsData, categoryIds } = req.body;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      if (patronsData && patronsData.length > 0) {
        const numbersToCheck = patronsData.map(p => p.number).filter(n => n && n.trim() !== '');
        if (numbersToCheck.length > 0) {
          const [existing] = await conn.query('SELECT patron_number FROM photo_salon_patrons WHERE patron_number IN (?) AND salon_id != ?', [numbersToCheck, req.params.id]);
          if (existing.length > 0) { await conn.rollback(); return res.status(400).json({ error: `Ezzel az azonosítóval (${existing[0].patron_number}) már létezik MÁSIK szalon a rendszerben!` }); }
        }
      }
      await conn.query('UPDATE photo_salons SET name=?, fee_amount=?, fee_currency=?, start_date=?, end_date=?, website=?, results_date=?, is_circuit=?, awards_count=?, cash_prize=?, circuit_number=?, submission_type=?, host_country_id=? WHERE id=?', [name, feeAmount || null, feeCurrency || 'EUR', startDate || null, endDate, website || null, resultsDate || null, isCircuit ? 1 : 0, awardsCount || 0, cashPrize || null, circuitNumber || null, submissionType || 'online', hostCountryId || null, req.params.id]);
      await conn.query('DELETE FROM photo_salon_patrons WHERE salon_id = ?', [req.params.id]);
      if (patronsData && patronsData.length > 0) {
        const pValues = patronsData.map(p => [req.params.id, p.id, p.number || null]);
        await conn.query('INSERT INTO photo_salon_patrons (salon_id, patron_id, patron_number) VALUES ?', [pValues]);
      }
      await conn.query('DELETE FROM photo_salon_categories WHERE salon_id = ?', [req.params.id]);
      if (categoryIds && categoryIds.length > 0) {
        const cValues = categoryIds.map(id => [req.params.id, id]);
        await conn.query('INSERT INTO photo_salon_categories (salon_id, category_id) VALUES ?', [cValues]);
      }
      await conn.commit(); res.json({ success: true });
    } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); } finally { conn.release(); }
  });

  app.delete('/api/salons/:id', async (req, res) => {
    try { await pool.query('DELETE FROM photo_salons WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });

  // SZALON NEVEZÉSEK
  app.get('/api/salon-entries/:salonId', async (req, res) => {
    try { const [rows] = await pool.query(`SELECT e.id as entry_id, e.category, e.award_id, e.achieved_score, e.acceptance_score, p.*, a.award_name FROM photo_salon_entries e JOIN photo_portfolio p ON e.portfolio_id = p.id LEFT JOIN photo_awards a ON e.award_id = a.id WHERE e.salon_id = ? AND e.user_email = ?`, [req.params.salonId, req.query.userEmail]); res.json(rows); } catch (err) { res.status(500).json({ error: 'Hiba a nevezések lekérésekor' }); }
  });
  app.post('/api/salon-entries', async (req, res) => {
    const { salonId, userEmail, portfolioId, category } = req.body;
    try {
      const [existing] = await pool.query('SELECT * FROM photo_salon_entries WHERE salon_id = ? AND portfolio_id = ? AND user_email = ?', [salonId, portfolioId, userEmail]);
      if (existing.length > 0) return res.status(400).json({ error: 'Ezt a képet már nevezted erre a szalonra!' });
      await pool.query('INSERT INTO photo_salon_entries (salon_id, user_email, portfolio_id, category) VALUES (?, ?, ?, ?)', [salonId, userEmail, portfolioId, category]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Hiba a nevezésnél' }); }
  });
  app.delete('/api/salon-entries/:id', async (req, res) => {
    try { await pool.query('DELETE FROM photo_salon_entries WHERE id = ? AND user_email = ?', [req.params.id, req.body.userEmail]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba a nevezés visszavonásakor' }); }
  });
  app.get('/api/my-salon-entries-status', async (req, res) => {
    try { const [rows] = await pool.query('SELECT DISTINCT salon_id FROM photo_salon_entries WHERE user_email = ?', [req.query.userEmail]); res.json(rows.map(r => r.salon_id)); } catch (err) { res.status(500).json({ error: 'Hiba' }); }
  });
  app.put('/api/salon-entries/:id/results', async (req, res) => {
    const { awardId, achievedScore, acceptanceScore, userEmail } = req.body;
    try { await pool.query('UPDATE photo_salon_entries SET award_id = ?, achieved_score = ?, acceptance_score = ? WHERE id = ? AND user_email = ?', [awardId || null, achievedScore || null, acceptanceScore || null, req.params.id, userEmail]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Hiba az eredmények mentésekor' }); }
  });

  // STATISZTIKÁK ÉS EXPORT
  app.get('/api/mafosz-progress', checkPremium, async (req, res) => {
    const userEmail = req.query.userEmail;
    try {
      const baseQuery = `FROM photo_salon_entries e JOIN photo_salons s ON e.salon_id = s.id JOIN photo_awards a ON e.award_id = a.id JOIN photo_salon_patrons sp ON sp.salon_id = s.id WHERE sp.patron_id = 3 AND e.user_email = ? AND e.award_id IS NOT NULL AND e.award_id > 0 AND a.award_name IS NOT NULL AND TRIM(a.award_name) != ''`;
      const [accRows] = await pool.query(`SELECT SUM(CASE WHEN LOWER(a.award_name) != 'acceptance' THEN 2 ELSE 1 END) as total_acceptances ${baseQuery}`, [userEmail]);
      const [workRows] = await pool.query(`SELECT COUNT(DISTINCT e.portfolio_id) as distinct_works ${baseQuery}`, [userEmail]);
      const [awardRows] = await pool.query(`SELECT SUM(CASE WHEN LOWER(a.award_name) != 'acceptance' THEN 1 ELSE 0 END) as total_awards ${baseQuery}`, [userEmail]);
      res.json({ acceptances: Number(accRows[0].total_acceptances) || 0, works: Number(workRows[0].distinct_works) || 0, awards: Number(awardRows[0].total_awards) || 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  
  app.get('/api/mafosz-entries', checkPremium, async (req, res) => {
    const userEmail = req.query.userEmail;
    try {
      const [rows] = await pool.query(`SELECT COALESCE(port.title, 'Ismeretlen / Törölt kép') as photo_title, s.name as salon_name, sp.patron_number as mafosz_number, a.award_name as award, s.submission_type, port.drive_file_id, port.file_url FROM photo_salon_entries e JOIN photo_salons s ON e.salon_id = s.id JOIN photo_awards a ON e.award_id = a.id JOIN photo_salon_patrons sp ON sp.salon_id = s.id WHERE sp.patron_id = 3 AND e.user_email = ? AND e.award_id IS NOT NULL AND e.award_id > 0 AND a.award_name IS NOT NULL AND TRIM(a.award_name) != '' ORDER BY s.name ASC, photo_title ASC`, [userEmail]);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/fiap-progress', checkPremium, async (req, res) => {
    const userEmail = req.query.userEmail;
    try {
      const baseWhere = `WHERE e.user_email = ? AND e.award_id IS NOT NULL AND e.award_id > 0 AND a.award_name IS NOT NULL AND TRIM(a.award_name) != '' AND EXISTS (SELECT 1 FROM photo_salon_patrons sp WHERE sp.salon_id = s.id AND sp.patron_id = 1)`;
      const [accRows] = await pool.query(`SELECT COALESCE(SUM(GREATEST(pre_2026_count, LEAST(pre_2026_count + post_2026_count, 10))), 0) as total_acceptances FROM (SELECT e.portfolio_id, SUM(CASE WHEN YEAR(s.end_date) < 2026 THEN 1 ELSE 0 END) as pre_2026_count, SUM(CASE WHEN YEAR(s.end_date) >= 2026 THEN 1 ELSE 0 END) as post_2026_count FROM photo_salon_entries e JOIN photo_salons s ON e.salon_id = s.id JOIN photo_awards a ON e.award_id = a.id ${baseWhere} GROUP BY e.portfolio_id) as sub`, [userEmail]);
      const [countryRows] = await pool.query(`SELECT COUNT(DISTINCT s.host_country_id) as distinct_countries FROM photo_salon_entries e JOIN photo_salons s ON e.salon_id = s.id JOIN photo_awards a ON e.award_id = a.id ${baseWhere}`, [userEmail]);
      const [workRows] = await pool.query(`SELECT COUNT(DISTINCT e.portfolio_id) as distinct_works FROM photo_salon_entries e JOIN photo_salons s ON e.salon_id = s.id JOIN photo_awards a ON e.award_id = a.id ${baseWhere}`, [userEmail]);
      res.json({ acceptances: Number(accRows[0].total_acceptances) || 0, countries: Number(countryRows[0].distinct_countries) || 0, works: Number(workRows[0].distinct_works) || 0 });
    } catch (err) { res.status(500).json({ error: 'Hiba a FIAP statisztika lekérésekor' }); }
  });

  app.get('/api/fiap-entries', checkPremium, async (req, res) => {
    const userEmail = req.query.userEmail;
    try {
      const [rows] = await pool.query(`SELECT COALESCE(p.title, 'Ismeretlen / Törölt kép') as photo_title, s.name as salon_name, c.country_hun as country, c.country_code as country_code, sp.patron_number as fiap_number, a.award_name as award, s.submission_type, p.drive_file_id, p.file_url FROM photo_salon_entries e JOIN photo_salons s ON e.salon_id = s.id JOIN photo_awards a ON e.award_id = a.id JOIN photo_salon_patrons sp ON sp.salon_id = s.id AND sp.patron_id = 1 LEFT JOIN photo_portfolio p ON e.portfolio_id = p.id LEFT JOIN photo_countries c ON s.host_country_id = c.id WHERE e.user_email = ? AND e.award_id IS NOT NULL AND e.award_id > 0 AND a.award_name IS NOT NULL AND TRIM(a.award_name) != '' ORDER BY s.name ASC, photo_title ASC`, [userEmail]);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Hiba a FIAP tételes lista lekérésekor' }); }
  });

  app.get('/api/export-fiap-c', checkPremium, async (req, res) => {
    const userEmail = req.query.userEmail;
    try {
      // 🎯 JAVÍTVA: Lekérjük az e.submission_type mezőt is az adatbázisból
      const [rows] = await pool.query(`
        SELECT 
          COALESCE(p.title, 'Ismeretlen / Törölt kép') as photo_title, 
          s.name as salon_name, 
          c.country as country_eng, 
          sp.patron_number as fiap_number, 
          a.award_name as award,
          e.submission_type
        FROM photo_salon_entries e 
        JOIN photo_salons s ON e.salon_id = s.id 
        JOIN photo_awards a ON e.award_id = a.id 
        JOIN photo_salon_patrons sp ON sp.salon_id = s.id AND sp.patron_id = 1 
        LEFT JOIN photo_portfolio p ON e.portfolio_id = p.id 
        LEFT JOIN photo_countries c ON s.host_country_id = c.id 
        WHERE e.user_email = ? 
          AND e.award_id IS NOT NULL 
          AND e.award_id > 0 
          AND a.award_name IS NOT NULL 
          AND TRIM(a.award_name) != '' 
        ORDER BY photo_title ASC, s.name ASC
      `, [userEmail]);

      let currentTitle = ''; let titleNum = 0; let accNum = 0; const exportData = [];

      rows.forEach(row => {
        accNum++; const t = row.photo_title.trim();
        if (t !== currentTitle) { titleNum++; currentTitle = t; }
        const finalAward = (row.award && row.award.toLowerCase() !== 'acceptance' && row.award.toLowerCase() !== 'elfogadás') ? row.award : '';
        
        // 🎯 JAVÍTVA: Meghatározzuk, hogy online (digitális) vagy nyomtatott (print) a nevezés
        const isDigital = row.submission_type && row.submission_type.toLowerCase() === 'online';

        exportData.push({ 
          'Acc. N°': accNum, 
          'Title N°': titleNum, 
          'Title of the work': t, 
          'Salon': row.salon_name, 
          'Country': row.country_eng || '', 
          'Nr FIAP yyyy/xxx': row.fiap_number || '', 
          'Award': finalAward,
          'Digital': isDigital ? 'x' : '', // 🎯 ÚJ OSZLOP
          'Print': !isDigital ? 'x' : ''    // 🎯 ÚJ OSZLOP
        });
      });

      const worksheet = xlsx.utils.json_to_sheet(exportData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "FIAP_Page_C_Data");
      const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Disposition', 'attachment; filename="FIAP_Page_C_Export.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(excelBuffer);
    } catch (err) { 
      console.error(err);
      res.status(500).json({ error: 'Szerver hiba az Excel generálásakor' }); 
    }
});

  // AI ÉS EXCEL IMPORT 
  app.get('/api/admin/scrape-fiap', async (req, res) => {
    try {
      const [existingPatrons] = await pool.query('SELECT patron_number FROM photo_salon_patrons WHERE patron_id = 1 AND patron_number IS NOT NULL');
      const existingFiapNumbers = existingPatrons.map(p => p.patron_number);
      
      const response = await fetch('https://www.myfiap.net/patronages', { 
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } 
      });
      if (!response.ok) throw new Error(`FIAP hiba: ${response.status}`);
      const html = await response.text(); const $ = cheerio.load(html); const scrapedSalons = [];
      
      $('table tbody tr').each((index, element) => {
        const tds = $(element).find('td');
        if (tds.length >= 11) {
          const fiapNumber = $(tds[0]).text().trim();
          if (fiapNumber && fiapNumber.includes('/') && !existingFiapNumbers.includes(fiapNumber)) {
            const typeRaw = $(tds[1]).text().trim(); const sectionsRaw = $(tds[2]).text().trim();
            let name = $(tds[4]).text().trim(); if (!name) name = $(tds[3]).text().trim();
            const country = $(tds[5]).text().trim(); const feeMatch = ($(tds[8]) ? $(tds[8]).text().trim() : '').match(/\d+/);
            const deadlineStr = $(tds[10]) ? $(tds[10]).text().trim() : ''; let website = $(tds[11]) ? $(tds[11]).text().trim() : '';
            if (website && !website.startsWith('http')) website = `https://${website}`;
            scrapedSalons.push({ fiap_number: fiapNumber, name: name || 'Névtelen Szalon', country: country, end_date_raw: deadlineStr, fee: feeMatch ? feeMatch[0] : null, website: website, categories: sectionsRaw.split(',').map(c => c.trim()).filter(c => c), submission_type: typeRaw.includes('PI') ? 'online' : 'print', is_circuit: (name.toLowerCase().includes('circuit') || $(tds[3]).text().toLowerCase().includes('circuit')) ? 1 : 0 });
          }
        }
      });
      res.json(scrapedSalons);
    } catch (err) { res.status(500).json({ error: `Hálózati hiba: ${err.message}` }); }
  });

  // ====================================================================
  // 🤖 JAVÍTVA: AI ALAPÚ ÉLŐ KERESÉS KATEGÓRIA KIGYŰJTÉSSEL
  // ====================================================================
  app.post('/api/admin/analyze-fiap-id', async (req, res) => {
    const { fiapNumber } = req.body;
    if (!fiapNumber) return res.status(400).json({ error: 'FIAP azonosító megadása kötelező!' });

    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        tools: [{ googleSearch: {} }] 
      });

      const prompt = `Használd a Google keresőt! Keresd meg a következő hivatalos FIAP védnökségi számmal (Patronage number) rendelkező fotópályázatot: "${fiapNumber}".
      Keresd meg a pályázat hivatalos kiírását (Regulations / Closing date), és gyűjtsd ki az adatokat szigorúan a talált weboldalak alapján.
      
      A válaszodban KIZÁRÓLAG egy darab tiszta JSON objektumot küldj vissza az alábbi struktúrával:
      {
        "name": "A pályázat hivatalos teljes angol neve (pl. 5th Balkan Exhibition 2026)",
        "website": "A pályázat hivatalos weboldalának közvetlen címe (URL)",
        "end_date": "A beküldési határidő (Closing date) YYYY-MM-DD formátumban.",
        "country": "A rendező ország hivatalos angol neve (pl. India, Spain, Serbia, Germany)",
        "fee": "A nevezési díj alapösszege euróban kifejezve, CSAK számként megadva (pl. 20 vagy 25)",
        "submission_type": "online" vagy "print",
        "is_circuit": true ha ez egy körverseny (Circuit), egyébként false,
        "categories": ["Open Color", "Open Monochrome", "Nature", "Travel"],
        "fiap_number": "${fiapNumber}"
      }
      
      Fontos: Ne írj semmilyen bevezető szöveget, magyarázatot vagy lezárást, csak a kért JSON objektumot formázd meg a válaszodban!`;

      const result = await model.generateContent(prompt);
      const text = await result.response.text();
      
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("Az AI nem generált érvényes struktúrát.");
      
      const parsedData = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
      res.json(parsedData);
    } catch (err) {
      res.status(500).json({ error: 'Hiba az AI élő keresése során: ' + err.message });
    }
  });




  app.post('/api/admin/import-fiap', async (req, res) => {
    const { salonsToImport } = req.body;
    if (!salonsToImport || salonsToImport.length === 0) return res.json({ count: 0 });
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction(); let importedCount = 0;
      const [dbCountries] = await conn.query('SELECT id, country, country_hun FROM photo_countries');
      const todayStr = new Date().toISOString().split('T')[0];
      for (const salon of salonsToImport) {
        if (salon.fiap_number) {
          const [existing] = await conn.query('SELECT salon_id FROM photo_salon_patrons WHERE patron_number = ?', [salon.fiap_number]);
          if (existing.length > 0) continue; 
        }
        const matchedCountry = dbCountries.find(c => c.country.toLowerCase() === salon.country.toLowerCase() || c.country_hun.toLowerCase() === salon.country.toLowerCase());
        const hostCountryId = matchedCountry ? matchedCountry.id : null;
        let formattedEndDate = null;
        if (salon.end_date_raw) { const d = new Date(salon.end_date_raw); if (!isNaN(d.getTime())) formattedEndDate = d.toISOString().split('T')[0]; }
        const [insertResult] = await conn.query('INSERT INTO photo_salons (name, start_date, end_date, website, fee_amount, fee_currency, is_circuit, submission_type, host_country_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [salon.name, todayStr, formattedEndDate, salon.website, salon.fee, 'EUR', salon.is_circuit, salon.submission_type, hostCountryId]);
        await conn.query('INSERT INTO photo_salon_patrons (salon_id, patron_id, patron_number) VALUES (?, ?, ?)', [insertResult.insertId, 1, salon.fiap_number]);
        importedCount++;
      }
      await conn.commit(); res.json({ count: importedCount, success: true });
    } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); } finally { conn.release(); }
  });

  app.post('/api/import/excel-analyze', upload.single('file'), checkPremium, async (req, res) => {
    const { userEmail } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Nincs fájl feltöltve!' });
  
    try {
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0]; 
      const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      cleanupTempFile(req.file);
  
      if (rawData.length === 0) return res.status(400).json({ error: 'Az Excel táblázat üres vagy nem olvasható.' });
      const sampleData = rawData.slice(0, 150);
  
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
      const prompt = `Kaptál egy nyers JSON adatot, ami egy fotós FIAP/MAFOSZ pályázati eredményeit tartalmazza egy Excelből. A feladatod, hogy normalizáld ezt az adatot, és egy szigorú, egységes JSON tömböt (Array) adj vissza! Szabályok minden sorhoz:
      - "title": Keresd meg a kép címét.
      - "fiapNumber": Keresd meg a FIAP vagy MAFOSZ azonosítót. Ha nincs, hagyd üresen.
      - "award": Keresd meg az eredményt. Ha nincs, legyen "Acceptance".
      - "salonName": Keresd meg a Szalon nevét. HA NINCS, akkor a "fiapNumber" alapján (a tudásbázisodból) találd ki a pályázat nevét! Ha sehogy sem tudod, legyen "Ismeretlen Szalon".
      KIZÁRÓLEG egy érvényes JSON tömböt adj vissza: [{"title": "Kép címe", "fiapNumber": "2024/001", "award": "Acceptance", "salonName": "Szalon Neve 2024"}]\nNyers adat:\n${JSON.stringify(sampleData)}`;
  
      const result = await model.generateContent(prompt);
      let text = await result.response.text();
      
      const jsonStart = text.indexOf('['); const jsonEnd = text.lastIndexOf(']');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("Az AI nem generált érvényes listát.");
      const normalizedArray = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
  
      const processedResults = [];
      const [dbPortfolio] = await pool.query('SELECT id, title FROM photo_portfolio WHERE user_email = ?', [userEmail]);
      const [dbSalons] = await pool.query('SELECT s.id, s.name, sp.patron_number FROM photo_salons s JOIN photo_salons_patrons sp ON s.id = sp.salon_id WHERE sp.patron_number IS NOT NULL AND sp.patron_number != ""');
      const [dbEntries] = await pool.query('SELECT salon_id, portfolio_id FROM photo_salon_entries WHERE user_email = ?', [userEmail]);
  
      for (const item of normalizedArray) {
        const itemTitle = item.title ? item.title.trim() : '';
        const itemFiap = item.fiapNumber ? item.fiapNumber.trim() : '';
        let status = 'ready'; let portfolioId = null; let salonId = null; let warnings = [];
  
        const matchedPhoto = dbPortfolio.find(p => p.title.toLowerCase() === itemTitle.toLowerCase());
        if (matchedPhoto) { portfolioId = matchedPhoto.id; } else { status = 'missing_photo'; warnings.push('A kép nincs a portfóliódban (üres keretként jön létre).'); }
  
        const matchedSalon = dbSalons.find(s => s.patron_number === itemFiap);
        if (matchedSalon) { salonId = matchedSalon.id; item.salonName = matchedSalon.name; } 
        else { if (status === 'ready') status = 'missing_salon'; else status = 'missing_both'; warnings.push('A szalon nem létezik, automatikusan létrejön.'); }
  
        if (portfolioId && salonId) {
          const isDuplicate = dbEntries.find(e => e.salon_id === salonId && e.portfolio_id === portfolioId);
          if (isDuplicate) { status = 'duplicate'; warnings = ['Ez az eredmény már szerepel a rendszerben!']; }
        }
        processedResults.push({ ...item, status, warnings, portfolioId, salonId });
      }
      res.json(processedResults);
    } catch (err) { cleanupTempFile(req.file); res.status(500).json({ error: 'Hiba történt az Excel elemzésekor: ' + err.message }); }
  });
  
  app.post('/api/import/execute', checkPremium, async (req, res) => {
    const { userEmail, userName, items } = req.body; 
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [dbAwards] = await conn.query('SELECT id, award_name FROM photo_awards');
  
      for (const item of items) {
        if (item.status === 'duplicate' || item.skip) continue; 
        let finalSalonId = item.salonId; let finalPortfolioId = item.portfolioId;
  
        if (!finalSalonId) {
          const todayStr = new Date().toISOString().split('T')[0];
          const [insSalon] = await conn.query('INSERT INTO photo_salons (name, start_date, end_date, submission_type) VALUES (?, ?, ?, ?)', [item.salonName || 'Importált Szalon', todayStr, todayStr, 'online']);
          finalSalonId = insSalon.insertId;
          if (item.fiapNumber) { await conn.query('INSERT INTO photo_salon_patrons (salon_id, patron_id, patron_number) VALUES (?, ?, ?)', [finalSalonId, 1, item.fiapNumber]); }
        }
  
        if (!finalPortfolioId) {
          const [insPhoto] = await conn.query('INSERT INTO photo_portfolio (user_email, user_name, title, file_url, drive_file_id) VALUES (?, ?, ?, ?, ?)', [userEmail, userName || 'Importált Felhasználó', item.title || 'Ismeretlen Kép', '', null]);
          finalPortfolioId = insPhoto.insertId;
        }
  
        let awardId = null;
        if (item.award) {
          const matchedAward = dbAwards.find(a => a.award_name.toLowerCase() === item.award.toLowerCase());
          if (matchedAward) { awardId = matchedAward.id; } 
          else {
            const [[{ nextId }]] = await conn.query('SELECT COALESCE(MAX(id), 0) + 1 as nextId FROM photo_awards');
            await conn.query('INSERT INTO photo_awards (id, award_name) VALUES (?, ?)', [nextId, item.award]);
            awardId = nextId; dbAwards.push({ id: awardId, award_name: item.award }); 
          }
        }
  
        await conn.query('INSERT INTO photo_salon_entries (salon_id, user_email, portfolio_id, award_id, category) VALUES (?, ?, ?, ?, ?)', [finalSalonId, userEmail, finalPortfolioId, awardId, 'Importált']);
      }
      await conn.commit(); res.json({ success: true });
    } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); } finally { conn.release(); }
  });
};
