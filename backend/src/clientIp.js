// The visitor's IP address without a port (A3). Azure App Service writes the port
// into X-Forwarded-For ("203.0.113.5:51234"), so req.ip can contain it; the rate
// limit and the audit log need the address only. req.ip itself depends on
// 'trust proxy' (TRUST_PROXY_HOPS in app.js).
function clientIp(req) {
  const ip = req.ip || '';
  const v4 = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(ip);
  if (v4) return v4[1];
  const v6 = /^\[([0-9a-fA-F:.]+)\]:\d+$/.exec(ip);
  return v6 ? v6[1] : ip;
}

module.exports = { clientIp };
