/* /api/config — οι δημόσιες ρυθμίσεις της σελίδας (το Firebase web config δεν είναι μυστικό· την ασφάλεια την κάνουν οι κανόνες του Firestore). */
module.exports = (req, res) => {
  let firebase = null;
  try { firebase = JSON.parse(process.env.FIREBASE_CONFIG || 'null') } catch (e) { firebase = null }
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'public, max-age=60');
  res.status(200).send(JSON.stringify({ firebase, ai: !!process.env.ANTHROPIC_API_KEY, botName: process.env.BOT_NAME || '🤖 Φύλακας' }));
};
