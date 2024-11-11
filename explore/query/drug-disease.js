/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
const path = require('path');
const sqlite3 = require('sqlite3');
const { db_p, sql } = require('../db_utils');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const db = new sqlite3.Database(process.env.EXPLORE_DB);

/**
 * @param {{
 *  sort?: {
 *    drug_name?: "asc" | "desc",
 *    disease_name?: "asc" | "desc",
 *    score?: "asc" | "desc",
 *    known?: "asc" | "desc",
 *  }
 *  filters?: {
 *    drug_name?: string,
 *    drug_id?: string,
 *    disease_name?: string,
 *    disease_id?: string,
 *  },
 *  pagination: {
 *    limit: number,
 *    offset: number,
 *  }
 * }} params
 * @returns {Promise<{
 *  rows: {
 *    drug_name: string,
 *    drug_id: string,
 *    disease_name: string,
 *    disease_id: string,
 *    score: number,
 *    known: number
 *  }[],
 *  num_of_results: number,
 *  limit: number,
 *  offset: number,
 * }>}
 */
async function getDrugDiseasePairs({ sort, filters, pagination }) {
  const { whereClause, whereParams } = buildWhereClause(filters);
  const orderByClause = buildOrderByClause(sort);

  const { paginationClause, paginationParams } = buildPaginationClause(pagination.limit, pagination.offset);

  const params = [...whereParams, ...paginationParams];

  const query = sql`\
    SELECT * FROM drug_disease_pairs${whereClause}${orderByClause}${paginationClause}\
  `;
  const countQuery = sql`\
    SELECT COUNT(*) AS total FROM drug_disease_pairs${whereClause}\
  `;

  return new Promise((resolve, reject) => {
    db.parallelize(() => {
      Promise.all([
        db_p.all(db, query, params),
        db_p.get(db, countQuery, whereParams),
      ])
        .then(([rows, { total }]) => {
          resolve({
            rows,
            num_of_results: total,
            ...pagination,
          });
        })
        .catch(reject);
    });
  });
}

function buildWhereClause(filters) {
  const whereClauses = [];
  const params = [];

  if (filters) {
    if (filters.drug_name) {
      whereClauses.push('drug_name LIKE ?');
      params.push(`%${filters.drug_name}%`);
    }
    if (filters.drug_id) {
      whereClauses.push('drug_id LIKE ?');
      params.push(`%${filters.drug_id}%`);
    }
    if (filters.disease_name) {
      whereClauses.push('disease_name LIKE ?');
      params.push(`%${filters.disease_name}%`);
    }
    if (filters.disease_id) {
      whereClauses.push('disease_id LIKE ?');
      params.push(`%${filters.disease_id}%`);
    }
  }

  const whereClause =
    (whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '');
  return { whereClause, whereParams: params };
}

function buildOrderByClause(sort) {
  let orderByClause = '';
  if (sort) {
    const orderClauses = [];
    for (const [column, direction] of Object.entries(sort)) {
      if (
        ['drug_name', 'disease_name', 'score', 'known'].includes(column) &&
        ['asc', 'desc'].includes(direction)
      ) {
        orderClauses.push(`${column} ${direction.toUpperCase()}`);
      }
    }
    if (orderClauses.length > 0) {
      orderByClause += ` ORDER BY ${orderClauses.join(', ')}`;
    }
  }
  return orderByClause;
}

function buildPaginationClause(limit, offset) {
  return {
    paginationClause: ' LIMIT ? OFFSET ?',
    paginationParams: [limit, offset],
  };
}

module.exports = {
  getDrugDiseasePairs,
};
