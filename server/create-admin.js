'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function main() {
  if (process.env.BOOTSTRAP_ACKNOWLEDGEMENT !== 'create-initial-admin') {
    throw new Error('Set BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin to provision an operator');
  }
  const email = String(process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  const name = String(process.env.PROVISION_ADMIN_NAME || 'Initial Administrator').trim();
  const tenantId = String(process.env.TENANT_ID || process.env.GOVERNANCE_TENANT_ID || '').trim();
  if (!email.includes('@') || typeof password !== 'string' || password.length < 12 || !tenantId) {
    throw new Error('A valid operator email, password of at least 12 characters, and tenant ID are required');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (email, password, name, role, tenant_id)
     VALUES ($1, $2, $3, 'admin', $4)
     ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password,
           name = EXCLUDED.name,
           role = 'admin',
           tenant_id = EXCLUDED.tenant_id`,
    [email, passwordHash, name, tenantId]
  );
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error.message);
    await pool.end().catch(() => {});
    process.exitCode = 1;
  });
