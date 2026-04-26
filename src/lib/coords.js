// WGS84 → LKS94 (EPSG:3346) Transverse Mercator forward projection
export function wgs84ToLks94(lat, lng) {
  const a = 6378137.0, f = 1 / 298.257222101;
  const k0 = 0.9998, lon0 = 24 * Math.PI / 180, FE = 500000;
  const phi = lat * Math.PI / 180, lam = lng * Math.PI / 180;
  const n = f / (2 - f);
  const A = a / (1 + n) * (1 + n * n / 4 + n * n * n * n / 64);
  const e = Math.sqrt(2 * f - f * f);
  const t = Math.tanh(Math.atanh(Math.sin(phi)) - e * Math.atanh(e * Math.sin(phi)));
  const xiP = Math.atan2(t, Math.cos(lam - lon0));
  const etaP = Math.atanh(Math.sin(lam - lon0) / Math.sqrt(1 + t * t));
  const alpha = [n / 2 - 2 * n * n / 3 + 5 * n * n * n / 16, 13 * n * n / 48 - 3 * n * n * n / 5, 61 * n * n * n / 240];
  let xi = xiP, eta = etaP;
  for (let j = 1; j <= 3; j++) {
    xi  += alpha[j - 1] * Math.sin(2 * j * xiP) * Math.cosh(2 * j * etaP);
    eta += alpha[j - 1] * Math.cos(2 * j * xiP) * Math.sinh(2 * j * etaP);
  }
  return { x: k0 * A * eta + FE, y: k0 * A * xi };
}

export function geoportalUrl(lat, lng) {
  const { x, y } = wgs84ToLks94(lat, lng);
  return `https://www.geoportal.lt/map/#s=3346&x=${x}&y=${y}&l=9&b=default`;
}
