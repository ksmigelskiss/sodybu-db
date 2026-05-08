// WGS84 → LKS94 (EPSG:3346) Transverse Mercator (Karney series)
export function wgs84ToLks94(lat, lng) {
  const a = 6378137.0, f = 1 / 298.257222101;
  const k0 = 0.9998, lon0 = 24 * Math.PI / 180, FE = 500000;
  const phi = lat * Math.PI / 180, lam = lng * Math.PI / 180;
  const n = f / (2 - f);
  const A = a / (1 + n) * (1 + n * n / 4 + n * n * n * n / 64);
  const e = Math.sqrt(2 * f - f * f);

  // Conformal latitude χ: sin(χ) = tanh(...)
  const sinChi = Math.tanh(Math.atanh(Math.sin(phi)) - e * Math.atanh(e * Math.sin(phi)));
  const cosChi = Math.sqrt(1 - sinChi * sinChi);
  const tauP = sinChi / cosChi; // tan(χ)

  const dl = lam - lon0;
  const xiP  = Math.atan2(tauP, Math.cos(dl));
  const etaP = Math.atanh(Math.sin(dl) / Math.sqrt(tauP * tauP + Math.cos(dl) * Math.cos(dl)));

  const alpha = [
    n / 2 - 2 * n * n / 3 + 5 * n * n * n / 16,
    13 * n * n / 48 - 3 * n * n * n / 5,
    61 * n * n * n / 240,
  ];
  let xi = xiP, eta = etaP;
  for (let j = 1; j <= 3; j++) {
    xi  += alpha[j - 1] * Math.sin(2 * j * xiP) * Math.cosh(2 * j * etaP);
    eta += alpha[j - 1] * Math.cos(2 * j * xiP) * Math.sinh(2 * j * etaP);
  }

  return { x: k0 * A * eta + FE, y: k0 * A * xi };
}

// LKS94 (EPSG:3346) → WGS84 inverse Transverse Mercator (Karney beta series)
// xNorthing: ~5900000–6200000, yEasting: ~300000–700000
export function lks94ToWgs84(xNorthing, yEasting) {
  const a = 6378137.0, f = 1 / 298.257222101;
  const k0 = 0.9998, lon0 = 24 * Math.PI / 180, FE = 500000;
  const n = f / (2 - f);
  const A = a / (1 + n) * (1 + n * n / 4 + n * n * n * n / 64);
  const e = Math.sqrt(2 * f - f * f);

  const xi  = xNorthing / (k0 * A);           // northing → xi
  const eta = (yEasting - FE) / (k0 * A);     // easting  → eta

  // Inverse (beta) series coefficients
  const beta = [
    -n / 2 + 2 * n * n / 3 - 37 * n * n * n / 96,
    -n * n / 48 - n * n * n / 15,
    -17 * n * n * n / 480,
  ];
  let xiP = xi, etaP = eta;
  for (let j = 1; j <= 3; j++) {
    xiP  += beta[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
    etaP += beta[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
  }

  const sinChi = Math.sin(xiP) / Math.cosh(etaP);
  // Iterative inverse conformal latitude
  let phi = Math.asin(sinChi);
  for (let i = 0; i < 5; i++) {
    const sp = Math.sin(phi);
    phi = 2 * Math.atan(Math.tan(Math.PI / 4 + Math.asin(sinChi) / 2) *
      Math.pow((1 + e * sp) / (1 - e * sp), e / 2)) - Math.PI / 2;
  }
  const lam = lon0 + Math.atan(Math.sinh(etaP) / Math.cos(xiP));

  return { lat: phi * 180 / Math.PI, lng: lam * 180 / Math.PI };
}

// Parse "X: 6164976 Y: 603754" or "6164976 603754" LKS94 format → {lat, lng} or null
export function parseLks94(str) {
  const s = str.replace(/,/g, '.').trim();
  // "X: 6164976 Y: 603754" or "X=6164976 Y=603754" or just "6164976 603754"
  const m =
    s.match(/[Xx][:\s=]+(\d{7})[,\s]+[Yy][:\s=]+(\d{6})/) ||
    s.match(/(\d{7})[,\s]+(\d{6})/);
  if (!m) return null;
  const xN = parseInt(m[1]), yE = parseInt(m[2]);
  // Sanity check: LT bounding box in LKS94
  if (xN < 5900000 || xN > 6250000) return null;
  if (yE < 300000  || yE > 700000)  return null;
  return lks94ToWgs84(xN, yE);
}

export function geoportalUrl(lat, lng) {
  const { x, y } = wgs84ToLks94(lat, lng);
  return `https://www.geoportal.lt/map/#s=3346&x=${x}&y=${y}&l=11&b=default`;
}
