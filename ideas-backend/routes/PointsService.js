const fs = require('fs');

/**
 * 🎯 PHOTAWESOME KÖZPONTI PONTKEZELŐ ÉS TRANZAKCIÓS MOTOR
 */
const PointsService = {
  // Alapvető gazdasági konstansok
  CONSTANTS: {
    // Szerzések
    EARN_ARENA_1ST: 100,
    EARN_ARENA_2ND: 50,
    EARN_ARENA_3RD: 25,
    EARN_ARENA_VOTE_BONUS: 10,
    EARN_MAP_UPLOAD: 20,
    
    // Költések
    COST_BUY_SWAP: 50,
    COST_PREMIUM_7DAYS: 200
  },

  /**
   * Tranzakcióbiztos pontmódosító és naplózó függvény
   * @param {Object} pool - MySQL adatbázis kapcsolat pool
   * @param {string} email - A felhasználó email címe
   * @param {number} amount - A pontváltozás összege (pozitív vagy negatív)
   * @param {string} reasonKey - Rendszerkulcs (pl. 'arena_victory', 'buy_swap')
   * @param {number|null} relatedId - Kapcsolódó entitás ID-ja (opcionális)
   * @param {string} descHu - Magyar nyelvű leírás a naplóba
   * @param {string} descEn - Angol nyelvű leírás a naplóba
   */
  async handleTransaction(pool, email, amount, reasonKey, relatedId = null, descHu, descEn) {
    if (!email) throw new Error("Hiányzó felhasználói email a pontkönyvelésnél!");
    
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Lekérjük a felhasználó jelenlegi pontegyenlegét (Zároljuk a sort módosításig: FOR UPDATE)
      const [userRows] = await conn.query(
        'SELECT points_balance FROM photo_users WHERE email = ? FOR UPDATE',
        [email]
      );

      if (userRows.length === 0) {
        throw new Error(`A felhasználó nem található: ${email}`);
      }

      const currentBalance = Number(userRows[0].points_balance || 0);
      const newBalance = currentBalance + amount;

      // Biztonsági fék: Nem engedjük az egyenleget nulla alá menni költésnél
      if (newBalance < 0) {
        throw new Error("Nincs elegendő pontegyenleg a tranzakció végrehajtásához!");
      }

      // 2. Frissítjük a felhasználó pontegyenlegét
      await conn.query(
        'UPDATE photo_users SET points_balance = ? WHERE email = ?',
        [newBalance, email]
      );

      // 3. Bejegyezzük a részletes tranzakciót a photo_points_ledger táblába
      await conn.query(
        `INSERT INTO photo_points_ledger 
          (user_email, points_changed, balance_after, reason_key, related_id, description_hu, description_en) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [email, amount, newBalance, reasonKey, relatedId, descHu, descEn]
      );

      // Ha minden rendben lefutott, véglegesítjük a MySQL-ben
      await conn.commit();
      console.log(`🪙 [LEDGER] Sikeres pontkönyvelés: ${email} (${amount > 0 ? '+' : ''}${amount} pont). Új egyenleg: ${newBalance}`);
      
      return { success: true, newBalance };
    } catch (err) {
      // Hiba esetén mindent visszavonunk, mintha meg sem történt volna
      await conn.rollback();
      console.error("❌ [LEDGER CRITICAL] Pontkönyvelési hiba, tranzakció visszagörgetve:", err.message);
      throw err;
    } finally {
      conn.release();
    }
  }
};

module.exports = PointsService;
