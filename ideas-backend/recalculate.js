const mysql = require('mysql2/promise');

// 🗄️ ADATBÁZIS KAPCSOLÓDÁS (Írd át a saját adataidra!)
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'photoapp' 
});

// 📊 VALÓS RANGPROGRESSZIÓS ERŐ-TÁBLÁZAT
function getVoterPower(likes, victories) {
  if (likes < 30) return { super: 1, brilliant: 2 };
  if (likes < 100) return { super: 2, brilliant: 3 };
  if (likes < 250) return { super: 2, brilliant: 4 };
  if (likes < 500) return { super: 3, brilliant: 5 };
  if (likes < 800 || victories < 1) return { super: 3, brilliant: 6 };
  if (likes < 1300 || victories < 2) return { super: 4, brilliant: 7 };
  if (likes < 2000 || victories < 3) return { super: 4, brilliant: 8 };
  if (likes < 3200 || victories < 5) return { super: 5, brilliant: 10 };
  if (likes < 4800 || victories < 7) return { super: 5, brilliant: 12 };
  if (likes < 7000 || victories < 9) return { super: 6, brilliant: 14 };
  if (likes < 10000 || victories < 12) return { super: 7, brilliant: 17 };
  return { super: 8, brilliant: 20 };
}

async function recalculateHistoricalScores() {
  console.log("🚀 Struktúra-biztos kronologikus újraszámolás indul...");
  
  // Ebben tároljuk a felhasználók növekvő pontjait az idővonalon haladva
  const virtualUsers = {};

  try {
    // 1. Témák lekérése szigorúan időrendben (id ASC)
    const [topics] = await pool.query('SELECT id FROM weekly_topics ORDER BY id ASC');
    console.log(`🔍 Összesen ${topics.length} futamot találtam az idővonalon.`);

    for (const topic of topics) {
      const topicId = topic.id;
      console.log(`--------------------------------------------------`);
      console.log(`📦 [Topic #${topicId}] Feldolgozása...`);

      // 2. Szavazatok lekérése a témához az entry-ken keresztül (voter_email, entry_id)
      const [votes] = await pool.query(`
        SELECT v.id, v.entry_id, v.voter_email, v.vote_type 
        FROM weekly_votes v
        INNER JOIN weekly_entries e ON v.entry_id = e.id
        WHERE e.topic_id = ?
      `, [topicId]);

      // 3. Nevezések lekérése a témához (id, user_email, views_count)
      const [entries] = await pool.query(
        'SELECT id, user_email, views_count FROM weekly_entries WHERE topic_id = ?', 
        [topicId]
      );

      // Pontgyűjtő kosár az entry-knek
      const entryScores = {};
      entries.forEach(e => { entryScores[e.id] = 0; });

      // 4. Szavazatok kiértékelése az AKKORI rangok alapján
      for (const vote of votes) {
        const voterEmail = vote.voter_email;
        const entryId = vote.entry_id;
        const type = vote.vote_type;

        if (entryScores[entryId] === undefined) continue;

        // Regisztráljuk a szavazót a virtuális térben, ha még új
        if (!virtualUsers[voterEmail]) {
          virtualUsers[voterEmail] = { totalLikes: 0, victories: 0 };
        }

        // Lekérjük az aktuális szavazati erejét, amivel EKKOR rendelkezett
        const currentPower = getVoterPower(
          virtualUsers[voterEmail].totalLikes, 
          virtualUsers[voterEmail].victories
        );

        // Pontosztás a tiszta séma szerint
        if (type === 'master') {
          entryScores[entryId] += 10; // A Képmesteri fix pont
        } else if (type === 'brilliant') {
          entryScores[entryId] += currentPower.brilliant;
        } else if (type === 'super') {
          entryScores[entryId] += currentPower.super;
        }
      }

      // 5. Pontok beírása a képekhez és a virtuális tulajdonosok egyenlegének frissítése
      let roundWinner = null;
      let maxScore = -1;
      let winnerViews = Infinity;

      for (const entry of entries) {
        const finalScore = entryScores[entry.id];
        
        // Frissítjük a konkrét kép pontszámát a `weekly_entries` táblában
        await pool.query('UPDATE weekly_entries SET likes_count = ? WHERE id = ?', [finalScore, entry.id]);

        const ownerEmail = entry.user_email;
        if (!virtualUsers[ownerEmail]) virtualUsers[ownerEmail] = { totalLikes: 0, victories: 0 };
        
        // A képért kapott pontokat hozzáadjuk a fotós történelmi egyenlegéhez
        virtualUsers[ownerEmail].totalLikes += finalScore;

        // 🏆 Forduló győztesének keresése (Döntetlen esetén a kevesebb views_count dönt)
        if (finalScore > maxScore) {
          maxScore = finalScore;
          winnerViews = Number(entry.views_count) || 0;
          roundWinner = ownerEmail;
        } else if (finalScore === maxScore && finalScore > 0) {
          const currentViews = Number(entry.views_count) || 0;
          if (currentViews < winnerViews) {
            winnerViews = currentViews;
            roundWinner = ownerEmail;
          }
        }
      }

      // Ha volt értékelhető nevezés, a győztesnek beírjuk a trófeát a virtuális térben
      if (roundWinner && maxScore > 0) {
        virtualUsers[roundWinner].victories += 1;
        console.log(`🏆 Forduló Győztese: ${roundWinner} (${maxScore} ⭐)`);
      }
    }

    // ==============================================================
    // 6. FINÁLÉ: A PROFILOK SZINKRONIZÁLÁSA A PHOTO_USERS TÁBLÁBA
    // ==============================================================
    console.log(`--------------------------------------------------`);
    console.log(`🔄 Felhasználói profilok végső mentése a photo_users táblába...`);
    
    for (const email in virtualUsers) {
      await pool.query(
        'UPDATE photo_users SET userTotalLikes = ?, userVictories = ? WHERE email = ?',
        [virtualUsers[email].totalLikes, virtualUsers[email].victories, email]
      );
    }

    console.log("🎉 SIKER! Az összes történelmi pontszám és rang progressziója hibátlanul újra lett építve!");

  } catch (error) {
    console.error("❌ Súlyos hiba az újraszámítás közben:", error);
  } finally {
    process.exit();
  }
}

// BUMM! Indulhat a mandula!
recalculateHistoricalScores();
