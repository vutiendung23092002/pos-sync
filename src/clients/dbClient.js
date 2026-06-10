import pg from "pg";

const { Pool } = pg;
const ADVISORY_LOCK_ID = 987654321;

export function createDbClient({ connectionString }) {
  const pool = new Pool({ connectionString });
  let lockConnection = null;

  async function query(text, values = []) {
    return pool.query(text, values);
  }

  async function getLarkTableConfig({ type, month, year }) {
    const result = await query(
      `SELECT base_id, table_id, type, month, year
       FROM han_lark_base.tables
       WHERE type = $1
         AND month = $2
         AND year = $3
       LIMIT 1;`,
      [type, month, year],
    );
    if (!result.rows[0]) {
      throw new Error(`Missing Lark table config: type=${type}, month=${month}, year=${year}`);
    }
    return result.rows[0];
  }

  async function getProductCostMap(skus) {
    const normalized = [
      ...new Set(
        skus
          .map((sku) => sku?.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    if (normalized.length === 0) return {};

    const result = await query(
      `SELECT sku, cost
       FROM kiot_legiahan.product_cost
       WHERE LOWER(sku) = ANY($1::text[]);`,
      [normalized],
    );
    return Object.fromEntries(
      result.rows
        .filter((row) => row.sku)
        .map((row) => [row.sku.trim().toLowerCase(), Number(row.cost ?? 0)]),
    );
  }

  async function tryAdvisoryLock() {
    if (lockConnection) throw new Error("Advisory lock is already held by this process");
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT pg_try_advisory_lock($1) AS locked;",
        [ADVISORY_LOCK_ID],
      );
      if (result.rows[0]?.locked !== true) {
        client.release();
        return false;
      }
      lockConnection = client;
      return true;
    } catch (error) {
      client.release();
      throw error;
    }
  }

  async function releaseAdvisoryLock() {
    if (!lockConnection) return;
    const client = lockConnection;
    lockConnection = null;
    try {
      await client.query("SELECT pg_advisory_unlock($1);", [ADVISORY_LOCK_ID]);
    } finally {
      client.release();
    }
  }

  async function close() {
    await releaseAdvisoryLock();
    await pool.end();
  }

  return {
    query,
    getLarkTableConfig,
    getProductCostMap,
    tryAdvisoryLock,
    releaseAdvisoryLock,
    close,
  };
}
