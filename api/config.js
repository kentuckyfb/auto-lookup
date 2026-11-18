const { json, databaseReady } = require('./_lib/data');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  json(res, 200, {
    auth: Boolean(process.env.SUPABASE_URL && anonKey),
    database: databaseReady(),
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseAnonKey: anonKey || null
  });
};
