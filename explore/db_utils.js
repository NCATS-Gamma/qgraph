const run = async (db, sql, params) => new Promise((res, rej) => {
  db.run(sql, params, (err) => {
    if (err) rej(err);
    else res();
  });
});

const all = async (db, sql, params) => new Promise((res, rej) => {
  db.all(sql, params, (err, rows) => {
    if (err) rej(err);
    else res(rows);
  });
});

/**
 * Same as normal template literal but 'sql' tag allows syntax highlighting in editor
 */
const sql = (strings, ...args) => strings.reduce((str, curr, i) => str + curr + (args[i] || ''), '');

module.exports = {
  /**
   * Promise-based wrappers for node-sqlite3. Attempts to mirror API, first param is db instance
   */
  db_p: {
    run,
    all,
  },
  sql,
};
