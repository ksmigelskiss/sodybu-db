import type { VercelRequest, VercelResponse } from '@vercel/node';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'lt,en-US;q=0.7,en;q=0.3',
  'Cache-Control': 'no-cache',
};

function overlay(originalUrl: string): string {
  // Escape for embedding inside the HTML string
  const safeUrl = originalUrl.replace(/'/g, "\\'");
  return `
<style>
  #__sb{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;
    background:#1a73e8;color:#fff;border:none;border-radius:30px;padding:15px 36px;
    font-size:17px;font-weight:700;cursor:pointer;box-shadow:0 4px 24px rgba(0,0,0,.4);
    font-family:system-ui,sans-serif;white-space:nowrap;}
  #__sb:disabled{opacity:.6;cursor:default;}
  #__sbback{position:fixed;top:env(safe-area-inset-top,12px);left:12px;z-index:2147483647;
    background:rgba(0,0,0,.55);color:#fff;border:none;border-radius:20px;
    padding:8px 16px;font-size:14px;cursor:pointer;font-family:system-ui,sans-serif;}
</style>
<button id="__sbback" onclick="location.href='/'">← Atgal</button>
<button id="__sb" onclick="__sbGo()">📥 Analizuoti skelbimą</button>
<script>
async function __sbGo(){
  var btn=document.getElementById('__sb');
  btn.disabled=true; btn.textContent='⏳ Analizuojama…';
  try {
    var h='';
    var img=document.querySelector('meta[property="og:image"]');
    if(img&&img.content) h+='[IMG: '+img.content+']\\n';
    var html=document.documentElement.innerHTML;
    var r1=/\\blat=(5[3456]\\.\\d{4,})[\\s\\S]{0,60}?lng=(2[0-6]\\.\\d{4,})/i.exec(html);
    if(r1){ h+='[GPS: lat='+r1[1]+', lng='+r1[2]+']\\n'; }
    else {
      var ss=document.querySelectorAll('script');
      var re=/["']?(?:lat(?:itude)?|y)["']?\\s*[:=]\\s*(5[3456]\\.\\d{4,})[\\s\\S]{0,80}?["']?(?:l(?:ng|on)(?:gitude)?|x)["']?\\s*[:=]\\s*(2[0-6]\\.\\d{4,})/i;
      for(var i=0;i<ss.length;i++){var m=re.exec(ss[i].textContent);if(m){h+='[GPS: lat='+m[1]+', lng='+m[2]+']\\n';break;}}
    }
    var t=document.body.innerText.slice(0,18000);
    var res=await fetch('/api/extract-listing',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({url:'${safeUrl}',text:h+t})
    });
    var json=await res.json();
    if(json.ok){
      sessionStorage.setItem('__sodybu_import',JSON.stringify({
        data:json.data, nuotrauka:json.nuotrauka, url:'${safeUrl}'
      }));
      location.href='/#import-preview';
    } else {
      btn.disabled=false; btn.textContent='❌ Klaida — bandyk dar';
    }
  } catch(e) {
    btn.disabled=false; btn.textContent='❌ '+e.message;
  }
}
</script>`;
}

function blockedPage(url: string): string {
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nepavyko</title>
<style>body{font-family:system-ui;padding:32px 24px;text-align:center;color:#202124;}</style>
</head><body>
<div style="font-size:48px;margin-bottom:16px">🔒</div>
<h2 style="margin:0 0 8px">Portalas blokuoja nuskaitymą</h2>
<p style="color:#5f6368;font-size:14px;margin:0 0 24px">
  Šis portalas naudoja Cloudflare apsaugą.<br>
  Nukopijuok URL ir naudok clipboard importą dashboarde.
</p>
<a href="/" style="display:inline-block;background:#1a73e8;color:white;padding:12px 28px;
  border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">← Grįžti į app</a>
</body></html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow embedding from our own app
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");

  const url = (req.query.url as string | undefined)?.trim();
  if (!url?.startsWith('http')) {
    return res.status(400).send('Missing or invalid url param');
  }

  try {
    const r = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
    });

    if (!r.ok) return res.status(200).send(blockedPage(url));

    let html = await r.text();

    if (
      html.includes('cf-challenge') ||
      html.includes('_cf_chl') ||
      html.includes('Just a moment') ||
      html.length < 2000
    ) {
      return res.status(200).send(blockedPage(url));
    }

    // Inject <base> so relative URLs (images, CSS) resolve against the original domain
    html = html.replace(/(<head[^>]*>)/i, `$1<base href="${url}">`);
    // Inject our overlay before </body>
    html = html.replace(/<\/body>/i, overlay(url) + '\n</body>');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch {
    res.status(200).send(blockedPage(url));
  }
}
