const path = require('path');
const sqlite3 = require('sqlite3');
const { db_p, sql } = require('../db_utils');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const db = new sqlite3.Database(process.env.EXPLORE_DB);

(async () => {
  const t0 = performance.now();

  let rows;
  try {
    rows = await db_p.all(
      db,
      sql`
        SELECT * FROM drug_disease_pairs
        WHERE disease_name = "sneeze"
        ORDER BY score DESC
        LIMIT 5 OFFSET 5
      `
    );
  } catch (err) {
    console.error(rows);
  }

  console.log(rows);

  console.log(performance.now() - t0);
})();
