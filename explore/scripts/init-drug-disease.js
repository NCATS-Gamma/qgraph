/* eslint-disable no-continue */
/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { db_p, sql } = require('../db_utils');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const input = '../data/raw/DrugtoDiseasePrediction-full-9-30-24.json';
const lowerScoreLimit = 0.5;

const db = new sqlite3.Database(process.env.EXPLORE_DB);

(async () => {
  await db_p.run(db, sql`
    CREATE TABLE IF NOT EXISTS drug_disease_pairs (
      drug_name    TEXT    NOT NULL,
      drug_id      TEXT    NOT NULL,
      disease_name TEXT    NOT NULL,
      disease_id   TEXT    NOT NULL,
      score        REAL    NOT NULL,
      known        BOOLEAN NOT NULL  CHECK (known IN (0, 1))
    )
  `);
  await db_p.run(db, sql`DELETE FROM drug_disease_pairs`);

  const rawMaps = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, input), 'utf-8'),
  );

  await db_p.run(db, sql`BEGIN TRANSACTION`);
  for (const [id, score] of Object.entries(rawMaps.Score).sort((a, b) => b[1] - a[1])) {
    if (score < lowerScoreLimit) continue;

    const drug = {
      id: rawMaps.DrugID[id],
      name: rawMaps.DrugName[id],
    };
    const disease = {
      id: rawMaps.DiseaseID[id],
      name: rawMaps.DiseaseName[id],
    };
    const known = rawMaps.Known[id] === '1';

    const command = sql`INSERT INTO drug_disease_pairs VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [
      drug.name,
      drug.id,
      disease.name,
      disease.id,
      score,
      known ? '1' : '0',
    ];

    try {
      db_p.run(db, command, params);
    } catch (err) {
      console.error('Error:', err, 'Params:', params);
    }
  }

  await db_p.run(db, sql`COMMIT`);
})();
