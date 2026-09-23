const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbw6MFudgHdhJBpLO5bd_kL5zdu-UA_Ty0E-CfxlaHf12utRLXYvt1xWPUl79y088E7_/exec';

export async function onRequest(context) {
  const request = context.request;
  if (request.method === 'OPTIONS') {
    return new Response(null,{status:204,headers:headers(request)});
  }
  if (!['GET','POST'].includes(request.method)) return new Response('Method Not Allowed',{status:405,headers:headers(request)});

  const gasUrl = context.env.GIATQ_GAS_URL || DEFAULT_GAS_URL;
  const target = new URL(gasUrl);
  const incoming = new URL(request.url);
  if (request.method === 'GET') target.search = incoming.search;

  const init = { method: request.method, redirect: 'follow', headers: {'Accept':'application/json'} };
  if (request.method === 'POST') {
    init.headers['Content-Type'] = 'text/plain;charset=utf-8';
    init.body = await request.text();
  }

  try {
    const upstream = await fetch(target.toString(), init);
    const body = await upstream.text();
    const h = headers(request);
    h.set('Content-Type', upstream.headers.get('content-type') || 'application/json;charset=utf-8');
    h.set('Cache-Control','no-store');
    return new Response(body,{status:upstream.status,headers:h});
  } catch (err) {
    return new Response(JSON.stringify({ok:false,error:{message:'Proxy GiatQ gagal menghubungi Apps Script.'}}),{status:502,headers:headers(request)});
  }
}

function headers(request){
  const h=new Headers();
  h.set('Access-Control-Allow-Origin', new URL(request.url).origin);
  h.set('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  h.set('Access-Control-Allow-Headers','Content-Type');
  h.set('X-Content-Type-Options','nosniff');
  h.set('Referrer-Policy','no-referrer');
  return h;
}
