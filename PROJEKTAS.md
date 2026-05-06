# Sodybų DB — projekto dokumentacija

> Asmeninis NT paieškos įrankis (sodybos / užsienio NT). React SPA, Firebase Firestore duomenų bazė, Vercel deployment. PWA (pridedama prie pagrindinio ekrano). Naudojama tik asmeniškai — nėra autentifikacijos.

---

## Tech stack

| Sluoksnis | Technologija |
|-----------|-------------|
| Frontend | React 18, Vite 5 |
| Žemėlapis | Leaflet + react-leaflet |
| Duomenų bazė | Firebase Firestore (NoSQL) |
| Nuotraukos | Firebase Storage |
| Serverless funkcijos | Vercel Node.js (`api/*.ts`) |
| AI ištraukimas | Anthropic Claude Haiku (per Vercel funkcijoje) |
| Deployment | Vercel (prod: `sodybu-db.vercel.app`) |
| PWA | manifest.json + minimal sw.js (sw neatlika caching) |

---

## Failų struktūra

```
sodybu-db/
├── api/                        # Vercel serverless funkcijos (Node.js/TS)
│   ├── cache-photo.ts          # Atsisiuntia nuotrauką → įkelia į Firebase Storage
│   ├── extract-listing.ts      # Scrape + AI ištraukimas (Claude Haiku) ← pagrindinis
│   ├── geo-proxy.ts            # Geoportal.lt WMS proxy (miškai, upės, saugomos teritorijos)
│   ├── geocode-proxy.ts        # Nominatim geocoding proxy
│   ├── listing-proxy.ts        # ≡ proxy.ts (duplikatas — abu identiški)
│   ├── og-fetch.ts             # Ištraukia og:image iš URL
│   ├── overpass-proxy.ts       # OSM Overpass API proxy (pastatai, vandens telkiniai)
│   ├── polygon-proxy.ts        # Kadastro plotas iš gyv. kodo (data.gov.lt)
│   └── proxy.ts                # ≡ listing-proxy.ts (duplikatas)
│
├── public/
│   ├── manifest.json           # PWA manifest (display: standalone, Share Target)
│   └── sw.js                   # Minimal SW: pass-through + offline fallback
│
├── src/
│   ├── App.jsx                 # Root komponentas (~941 eilučių) — visi state, layoutai
│   │
│   ├── hooks/
│   │   ├── useVietos.js        # CRUD: 'vietos' kolekcija (įrašytos sodybos)
│   │   ├── usePortalai.js      # CRUD: 'portalai' kolekcija (šaltinių portalai)
│   │   ├── useSodyba.js        # Read-only: 'sodyba' kolekcija (OSM zonų kandidatai)
│   │   └── useIsMobile.js      # window.innerWidth < 768
│   │
│   ├── lib/
│   │   ├── firebase.js         # Firebase init (client SDK) — eksportuoja db, storage
│   │   ├── theme.js            # Statusų spalvos, VIETA_ATTRS, UZSIENIS_ATTRS
│   │   ├── salis.js            # Šalių sistema: SALYS[], detectSalis(), salisInfo()
│   │   ├── coords.js           # WGS84→LKS94, geoportalUrl()
│   │   ├── apskritys.js        # 10 apskričių centroidai + bbox
│   │   ├── mapLayers.js        # Leaflet tile layers, marker ikonos, kadastro overlay
│   │   ├── osmFeatures.js      # fetchPolygon(), fetchOsmFeatures(), renderOsmFeatures()
│   │   ├── photos.js           # Client-side nuotraukų compression + Storage upload
│   │   ├── openExternal.js     # window.open() wrapper (iOS PWA link fix)
│   │   └── status.js           # ⚠️ NAUDOJAMAS NIEKUR — dead file
│   │
│   └── components/
│       ├── App.jsx inlined:    # SearchBox, VietaStatusFilter, SalisFilter,
│       │                       # ZonuFilters, ApskritisBar, FabBtn, EmptyState
│       ├── SodybaMap.jsx       # Leaflet žemėlapis (363 el.)
│       ├── VietaPanel.jsx      # Dešinysis/apatinis panel — sodybos detalės (664 el.)
│       ├── SkelbimosImport.jsx # AI importo wizard (799 el.)
│       ├── KortelesGrid.jsx    # 2-stulpelių kortelių grid (Lietuva + Užsienyje)
│       ├── PortalaiTab.jsx     # Šaltinių portalų CRUD sąrašas (270 el.)
│       ├── PhotoStrip.jsx      # Horizontali nuotraukų juosta + lightbox + upload
│       ├── DetailPanel.jsx     # Dešinysis panel zonai (sodyba kolekcija)
│       ├── VietaForm.jsx       # Paprastas "nauja vieta" form po žemėlapio paspaudimo
│       ├── SodybaCard.jsx      # Kortelė vietovių sąraše
│       ├── LithuaniaMiniMap.jsx# SVG mini-žemėlapis (geografinė orientacija)
│       ├── VietaCard.jsx       # ⚠️ NAUDOJAMAS NIEKUR — dead component
│       └── SkelbimosForm.jsx   # ⚠️ NAUDOJAMAS NIEKUR — dead component
│
├── scripts/                    # Admin skriptai (ne deployjami)
├── .env.local                  # Firebase client raktai (gitignored ✓)
├── service-account.json        # Firebase Admin SA (gitignored ✓, tik lokaliai)
├── vercel.json                 # Tik: /api/* rewrite
└── vite.config.js
```

---

## Firestore kolekcijos

### `vietos` — pagrindinė kolekcija

Vartotojo išsaugotos sodybos / nekilnojamas turtas.

```
{
  id: string (auto),
  lat: number,
  lng: number,
  statusas: 'zinoti' | 'nuvaziuoti' | 'aplankyta' | 'atmesta',
  komentaras: string | null,
  kaina: number | null,
  url: string | null,            // skelbimo nuoroda
  saltinis: 'skelbimas' | null,  // 'skelbimas' = importuota per AI
  zonaPavadinimas: string | null,
  gyv_kodas: string | null,
  adresas: string | null,
  tel: string | null,
  salis: string | null,          // 'lt' | 'es' | 'pt' | ... null=lt
  nuotraukos: string[],          // Firebase Storage URL arba external URL
  zvaigzdute: boolean | null,    // žvaigždutė / mėgstamiausias
  // Atributai (boolean):
  upelis, tvenkinys, sodas, medziai,          // LT atributai
  prie_juros, gamtoje, baseinas, kaimas,      // Užsienio atributai
  created_at: Timestamp,
}
```

### `portalai` — NT portalų šaltiniai

```
{
  id: string (auto),
  domain: string,          // 'aruodas.lt', 'skelbiu.lt', ...
  pavadinimas: string,
  aprasymas: string | null,
  searchUrl: string | null, // vartotojo filtruotos paieškos URL
  regionas: 'lt' | 'eu' | 'other',
  created_at: Timestamp,
}
```

### `sodyba` — OSM zonų kandidatai (read-only)

Importuota iš OpenStreetMap. Naudojama "Vietovės" tab'e zona paieškai.

```
{
  id: string,
  pavadinimas: string,
  tipas: 'gyvenamoji' | 'miško' | ...,
  adresas: string,
  lat, lng: number,
  apskritis: string,
  gyv_kodas: string,
  plotas: number | null,
}
```

---

## Firestore saugumo taisyklės

⚠️ **Svarbu**: `portalai` kolekcija buvo pridėta rankiniu būdu per Firebase REST API (ne CLI), nes trūko `rules` įrašo.

Dabartinė būklė: taisyklės leidžia CRUD be autentifikacijos (asmeninis įrankis). Jei ateityje reikės — pridėti `request.auth != null`.

---

## Vercel API funkcijos

### `/api/extract-listing` ⭐ Pagrindinis

**Tikslas**: iš NT skelbimo URL ištrauka struktūruotus duomenis per Claude AI.

**Srautas**:
1. Gauna `url` arba `html` arba `text`
2. Jei URL — server-side scrape su bot-bypass headers
3. Iš HTML ištraukia GPS (URL params, JS blokai), og:image
4. HTML → plain text (strip tags)
5. Siunčia Claude `claude-haiku-4-5` → JSON: `{ pavadinimas, kaina, adresas, lat, lng, tel, aprasymas, nuotrauka }`
6. Grąžina + `appUrl` (deep link į apps)

**Env**: `ANTHROPIC_API_KEY`

⚠️ **Saugumo spraga**: nėra autentifikacijos — bet kas gali siųsti requestus ir naudoti API kreditus.

### `/api/cache-photo`

Atsisiuntia nuotrauką iš išorinio URL → įkelia į Firebase Storage → grąžina Storage URL.

- Naudoja Firebase Admin SDK
- Skip jei URL jau yra `firebasestorage.app` arba `storage.googleapis.com`
- Failas: `vietos/{vietaId}/{timestamp}.{ext}`
- Publicinis URL: `https://storage.googleapis.com/sodybu-db.firebasestorage.app/...`

**Env**: `FIREBASE_SERVICE_ACCOUNT` (JSON string)

### `/api/geo-proxy`

5 lygiagrečios Geoportal.lt WMS/identify užklausos vienai koordinatei:
- Miškai, upės/ežerai, Natura 2000, saugomos teritorijos, kultūros paveldas

⚠️ **Nėra Vercel cache** — kiekvienam selektui 5 requestai iš naujo.

### `/api/overpass-proxy`

OSM Overpass API proxy — pastatai ir vandens telkiniai bbox'e.

⚠️ **Nėra Vercel cache** — lėta, gali failinti.

**Fallback**: `overpass.kumi.systems` jei `overpass-api.de` lėta.

### `/api/polygon-proxy`

Kadastro plotas pagal gyv. kodą iš `data.gov.lt` → WKT LKS94 → WGS84 koordinatės.

✓ Cache: `s-maxage=86400, stale-while-revalidate=3600`

### `/api/geocode-proxy`

Nominatim geocoding (adresas → koordinatės).

✓ Cache: `s-maxage=300`

### `/api/og-fetch`

Paprasta og:image URL ištraukimas iš HTML.

✓ Cache: `s-maxage=86400`

### `/api/listing-proxy` ir `/api/proxy`

**Identiški failai** — abu proxy NT skelbimo puslapį su injected overlay mygtukas. Tik vienas naudojamas. Reikia išvalyti.

---

## Pagrindiniai srautai

### AI importas (SkelbimosImport.jsx)

```
Vartotojas įklijuoja URL
  → /api/extract-listing (scrape + Claude AI)
  → Preview: vieta žemėlapyje, duomenų redagavimas
  → /api/cache-photo (nuotraukos išsaugojimas)
  → Firestore: addDoc('vietos', data)
  → /api portalai: ensurePortal(domain) → upsert į 'portalai'
```

### Nuotraukų caching (VietaPanel.jsx useEffect)

```
Panel atidarytas su vieta:
  if (nuotraukos[0] yra išorinis URL):
    /api/cache-photo → Storage URL → updateVieta({ nuotraukos: [storageUrl] })
  else if (nėra nuotraukų && vieta.url):
    /api/og-fetch → imgUrl
    /api/cache-photo → Storage URL → updateVieta({ nuotraukos: [storageUrl] })
```

### Sodybos vaizdas (SodybaMap.jsx)

- Leaflet `tileLayer` keitimas (palydovas ↔ OSM)
- Kadastro overlay: WMS tiles iš Geoportal.lt
- County boundaries: Nominatim → `localStorage` cache
- OSM features: `overpass-proxy` → `useRef(Map)` in-memory cache (per sesija)
- Minimap: visada matomas desktop'e kai zoom > 7

---

## UI struktūra

### Desktop (≥768px)

```
┌─────────────────┬──────────────────────────────────┐
│  380px kairysis │  Pilnas ekranas žemėlapis         │
│  panel          │                                  │
│  ┌───────────┐  │  [Minimap SVG — viršutinis dešin]│
│  │ TABS:     │  │                                  │
│  │ Lietuva   │  │  [Vietovių overlay — kairysis]   │
│  │ Užsienyje │  │                                  │
│  │ Vietovės  │  │                                  │
│  │ Šaltiniai │  │                                  │
│  └───────────┘  │                                  │
│  [filtrai]      │                                  │
│  [kortelių grid]│                                  │
│  arba [map list]│                                  │
└─────────────────┴──────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────────┐
│  Pilnas ekranas žemėlapis    │
│                              │
│  [FAB mygtukai: +, locate]   │
├──────────────────────────────┤
│  Bottom sheet (swipe up/down)│
│  ┌────┬──────────┬─────────┐ │
│  │🏠  │🌐       │🌐       │ │
│  │Lietuva│Užsienyje│Šaltiniai│
│  └────┴──────────┴─────────┘ │
│  [filtrai pagal aktyvų tabą] │
│  [kortelių grid] ← swipe →  │
└──────────────────────────────┘
```

Sheet aukštis: 52px (uždarytas) ↔ 72dvh (atidarytas, fiksuotas).

---

## Tab sistema

| Tab ID | Desktop | Mobile | Turinys |
|--------|---------|--------|---------|
| `lietuva` | ✓ | ✓ | LT sodybos, `isLt(v)` filtras |
| `uzsienis` | ✓ | ✓ | Užsienio NT, `isForeign(v)` filtras |
| `vietoves` | ✓ | ✗ | OSM zonų sąrašas + žemėlapis |
| `portalai` | ✓ | ✓ (Šaltiniai) | NT portalų CRUD |

Tab keitimas su `handleTabChange(id)`:
- `lietuva` → `ltFlyTrigger++` → žemėlapis grįžta į Lietuvą
- `uzsienis` → `euFlyTrigger++` → `flyTo([47, 10], 4)` (Europa)

---

## Šalių sistema (`src/lib/salis.js`)

```js
detectSalis(domain) // → šalies kodas arba null (= LT)
salisInfo(code)     // → { code, flag, label }
isLt(vieta)         // → !vieta.salis || vieta.salis === 'lt'
isForeign(vieta)    // → !isLt(vieta)
```

Palaikomos šalys: lt, es, pt, hr, it, gr, fr, de, lv, ee, pl, other.

Domain → šalis aptikimas:
1. `DOMAIN_MAP`: žinomų portalų domenų sąrašas
2. `TLD_MAP`: ccTLD (`.es`, `.pt`, ...)
3. LT domenai: ss.lv, city24.lv ir pan. → lt

---

## Atributų sistema

### LT atributai (`VIETA_ATTRS` in theme.js)
| key | label | ikona |
|-----|-------|-------|
| upelis | Upelis | Droplets |
| tvenkinys | Tvenkinys | Waves |
| sodas | Sodas | Apple |
| medziai | Medžiai | Trees |

### Užsienio atributai (`UZSIENIS_ATTRS` in theme.js)
| key | label | ikona |
|-----|-------|-------|
| prie_juros | Prie jūros | Anchor |
| gamtoje | Gamtoje | Mountain |
| baseinas | Baseinas | Sun |
| kaimas | Kaimas | Home |

---

## Statusų sistema

| statusas | label | spalva |
|----------|-------|--------|
| `zinoti` | Žinoti | mėlyna |
| `nuvaziuoti` | Nuvažiuoti | oranžinė |
| `aplankyta` | Aplankyta | žalia |
| `atmesta` | Atmesta | raudona |

---

## Nuotraukų sistema

### Client-side upload (PhotoStrip.jsx + photos.js)
1. Vartotojas pasirenka nuotrauką
2. `photos.js`: compress → `canvas.toBlob` (max 1200px, 0.82 quality)
3. Firebase Storage: `vietos/{vietaId}/{timestamp}.jpg`
4. URL → `updateVieta({ nuotraukos: [...prev, url] })`

### Server-side caching (cache-photo.ts)
- Išoriniai URL (iš skelbimų) → Firebase Storage (kad neprarastų po skelbimo ištrynimo)
- Triggerinamas kai `VietaPanel` atsidaro su nauja vieta

---

## Aplinkos kintamieji

### `.env.local` (client, Vite, gitignored)
```
VITE_FB_API_KEY
VITE_FB_AUTH_DOMAIN
VITE_FB_PROJECT_ID
VITE_FB_STORAGE_BUCKET
VITE_FB_MESSAGING_SENDER_ID
VITE_FB_APP_ID
```

### Vercel environment (server, API funkcijoms)
```
ANTHROPIC_API_KEY         # Claude Haiku (extract-listing)
FIREBASE_SERVICE_ACCOUNT  # JSON string (Admin SDK, cache-photo)
```

### Lokaliai (ne deployjama)
```
service-account.json      # Firebase Admin private key (gitignored ✓)
```

---

## Žinomi trūkumai / optimizacijos galimybės

### 🔴 Kritiniai

1. **`extract-listing` nėra apsaugotas** — open endpoint, bet kas gali naudoti Anthropic API kreditus. Pridėti `X-Internal-Secret` header arba Vercel Edge Middleware origin check.

2. **`api/proxy.ts` = `api/listing-proxy.ts`** — identiški failai. Abu deployjami į Vercel kaip atskiri endpoints. Reikia pašalinti vieną.

### 🟡 Svarbūs

3. **`geo-proxy.ts` nėra Vercel cache** — kiekvienam zonos atidarymui 5 Geoportal requestai. Pridėti `res.setHeader('Cache-Control', 's-maxage=86400')`.

4. **`overpass-proxy.ts` nėra Vercel cache** — OSM duomenys nesikeičia dažnai. Pridėti `s-maxage=3600`.

5. **`ensurePortal` N+1** — kiekvienam unikaliam domenui atskira Firestore `where` užklausa. Galima batching: `where('domain', 'in', [domain1, domain2, ...])` (max 30).

6. **Bundle ~835KB** — nėra code splitting. Galima: `React.lazy` SkelbimosImport, manual chunks Leaflet + Firebase.

### 🟢 Nedideli

7. **Dead files**: `src/lib/status.js`, `src/components/VietaCard.jsx`, `src/components/SkelbimosForm.jsx` — niekur neimportuojami.

8. **`parseCoords()` duplikuota** — `SkelbimosImport.jsx` ir `VietaPanel.jsx`. Perkelti į `src/lib/coords.js`.

9. **`apskritisLabel` KortelesGrid** nenaudoja lng korekcijos (0.6 cos faktorius kaip `apskritys.js`). Gali skirtis prie sienų.

10. **Service worker nieko nekešuoja** — offline mode neveikia. `CACHE = 'sodybu-v1'` apibrėžtas bet niekada nepopuliuojamas.

11. **County boundaries per Nominatim tiesiogiai** — `SodybaMap.jsx` kreipiasi į `nominatim.openstreetmap.org` iš naršyklės. Reikėtų proxy su server-side cache.

12. **`locateMe` nėra error handlerio** — tyliai failina jei vartotojas atmetė leidimą.

---

## Deployment

```bash
# Build + deploy į produkciją
npm run build && npx vercel --prod

# Tik preview
npx vercel
```

Prod URL: **https://sodybu-db.vercel.app**

GitHub: `https://github.com/ksmigelskiss/sodybu-db` (privatus)

---

## Dažniausios klaidos / debug

### Firestore "Missing or insufficient permissions"
- Tikrink Firebase Console → Firestore → Rules
- Dažna priežastis: nauja kolekcija nepridėta į rules

### `portalai` kolekcija neveikia
- Buvo fiksuota 2025-05 — rules buvo be `portalai`
- Dabar yra. Jei vėl – tikrink rules.

### Nuotraukos neatsiranda po tab switch
- Sprendimas: abu tab'ai (`lietuva`/`uzsienis`) mount'inami kartu su `display:none` — DOM išsaugomas, `<img>` nereload'ina

### Mobile linkai atsidarinėja app viduje
- Sprendimas: `src/lib/openExternal.js` — `window.open()` vietoje `<a href>` default elgesio
- iOS PWA standalone mode ignoruoja `target="_blank"` senesnėse versijose

### `m.aruodas.lt` neaptinkamas kaip `aruodas.lt`
- Fiksuota `extractDomain()` `usePortalai.js` — strip `m.`, `mobile.`, `wap.` prefixes (tik jei ≥3 dalys)
