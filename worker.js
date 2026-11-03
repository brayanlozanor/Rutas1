import {
  LIST_KEYS,
  loadStatePart,
  getSyncMeta,
  saveFullState,
  upsertRecord,
  applyChanges,
  getEvidenceDataUrl,
  getMaterialPhotoDataUrl,
  recordWorkOrderReviewExit,
  upsertWorkOrderReport,
  findLoginUser,
  deletePlans,
  deleteRecord,
  getDashboardGoal,
  setDashboardGoal,
  ensureRelationalSchema
} from './relational-store.js';

const CORS = {
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
};

const SESSION_COOKIE = 'netops_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function encodeBase64Url(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}

async function signSessionPayload(payload, secret) {
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{ name:'HMAC',hash:'SHA-256' },false,['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload)));
}

function sessionSecret(env) {
  const secret = String(env.AUTH_SECRET || '');
  return secret.length >= 32 ? secret : '';
}

async function createSessionToken(env,user) {
  const secret = sessionSecret(env);
  if (!secret) throw new Error('AUTH_SECRET no esta configurado o es demasiado corto');
  const now = Math.floor(Date.now() / 1000);
  const payload = encodeBase64Url(JSON.stringify({sub:String(user.id||''),name:String(user.name||''),username:String(user.username||''),role:String(user.role||''),iat:now,exp:now+SESSION_TTL_SECONDS}));
  const signature = encodeBase64Url(await signSessionPayload(payload,secret));
  return {token:`v1.${payload}.${signature}`,expiresAt:new Date((now+SESSION_TTL_SECONDS)*1000).toISOString()};
}

function readCookie(request,name) {
  for (const cookie of String(request.headers.get('cookie')||'').split(';')) {
    const separator=cookie.indexOf('=');
    if (separator>=0 && cookie.slice(0,separator).trim()===name) return cookie.slice(separator+1).trim();
  }
  return '';
}

function constantTimeEqual(left,right) {
  const a=decodeBase64Url(left); const b=decodeBase64Url(right);
  if (a.length!==b.length) return false;
  let difference=0;
  for (let index=0;index<a.length;index+=1) difference|=a[index]^b[index];
  return difference===0;
}

async function getSession(request,env) {
  const secret=sessionSecret(env); const token=readCookie(request,SESSION_COOKIE);
  if (!secret||!token) return null;
  const parts=token.split('.');
  if (parts.length!==3||parts[0]!=='v1') return null;
  try {
    const expected=encodeBase64Url(await signSessionPayload(parts[1],secret));
    if (!constantTimeEqual(parts[2],expected)) return null;
    const payload=JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
    if (!payload.sub||!payload.exp||payload.exp<=Math.floor(Date.now()/1000)) return null;
    return payload;
  } catch { return null; }
}

function sessionCookie(request,token,maxAge=SESSION_TTL_SECONDS) {
  const secure=new URL(request.url).protocol==='https:'?'; Secure':'';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

function hasRole(session,...roles) {
  return roles.includes(String(session?.role||'').trim().toLowerCase());
}

function isPrincipalAdministrator(session) {
  return hasRole(session,'administrador','admin')&&String(session?.username||'').trim().toLowerCase()==='abraham';
}

function hasTrustedOrigin(request) {
  const origin=String(request.headers.get('origin')||'').trim();
  return !origin||origin===new URL(request.url).origin;
}

function forbidden(requestId) {
  return json({ok:false,success:false,error:'No tienes permiso para realizar esta operacion',errorType:'AUTORIZACION',errorCode:'FORBIDDEN',requestId},403);
}

function sanitizeDataForSession(data,session) {
  if (!data||typeof data!=='object'||hasRole(session,'administrador','admin')) return data;
  if (Array.isArray(data.users)) data.users=hasRole(session,'atencion_clientes')?data.users.filter(user=>['tecnico','administrador','admin'].includes(String(user.role||'').toLowerCase())):data.users.filter(user=>String(user.id||'')===String(session.sub||''));
  if (Array.isArray(data.auditLog)) data.auditLog=hasRole(session,'atencion_clientes')?data.auditLog.filter(item=>String(item.byRole||'').toLowerCase()==='tecnico'):data.auditLog.filter(item=>String(item.byId||'')===String(session.sub||''));
  return data;
}

function classifyApiError(error) {
  const message = String(error?.message || error || 'Error desconocido');
  const lower = message.toLowerCase();
  if (error instanceof SyntaxError || lower.includes('json')) return { type:'DATOS_INVALIDOS', code:'INVALID_JSON', status:400 };
  if (lower.includes('d1') || lower.includes('sqlite') || lower.includes('sql') || lower.includes('constraint') || lower.includes('foreign key')) {
    return { type:'BASE_DE_DATOS', code:'D1_OPERATION_FAILED', status:500 };
  }
  return { type:'SERVIDOR', code:'WORKER_OPERATION_FAILED', status:500 };
}

function dataUrlToImageResponse(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return json({ ok: false, error: 'Evidencia invalida' }, 404);
  const bytes = Uint8Array.from(atob(match[2]), ch => ch.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      ...CORS,
      'Content-Type': match[1],
      'Cache-Control': 'private, no-store'
    }
  });
}

async function recordSuccessfulLogin(env, user, request) {
  if (!user) return;
  try {
    await upsertRecord(env, 'auditLog', {
      id: `au-login-${crypto.randomUUID()}`,
      action: 'inició sesión',
      at: new Date().toISOString(),
      byId: String(user.id || ''),
      byName: String(user.name || user.username || 'Usuario'),
      byUsername: String(user.username || ''),
      byRole: String(user.role || ''),
      targetId: 'platform-login',
      targetName: 'Acceso a la plataforma',
      targetType: 'sesión',
      userAgent: String(request.headers.get('user-agent') || '')
    });
  } catch (error) {
    console.error('No se pudo registrar el inicio de sesión', error);
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const isApiRequest = url.pathname.startsWith('/api/');

    if (!isApiRequest) {
      if (env.ASSETS) {
        const assetResponse = await env.ASSETS.fetch(request);
        const headers = new Headers(assetResponse.headers);
        const isHtml = url.pathname === '/' || url.pathname.endsWith('.html');
        headers.set('Cache-Control', !assetResponse.ok
          ? 'no-store'
          : isHtml
            ? 'no-cache, must-revalidate'
            : 'public, max-age=3600, stale-while-revalidate=86400');
        headers.delete('Pragma');
        return new Response(assetResponse.body, {
          status: assetResponse.status,
          statusText: assetResponse.statusText,
          headers
        });
      }
      return json({ error: 'Ruta no encontrada' }, 404);
    }

    const requestId = request.headers.get('cf-ray') || crypto.randomUUID();
    try {
      if (request.method === 'POST' && !hasTrustedOrigin(request)) {
        return json({ok:false,success:false,error:'Origen de solicitud no permitido',errorType:'AUTORIZACION',errorCode:'ORIGIN_NOT_ALLOWED',requestId},403);
      }
      if (url.pathname.startsWith('/api/')) {
        try {
          await ensureRelationalSchema(env);
        } catch (schemaErr) {
          console.warn('[Worker] ensureRelationalSchema error:', schemaErr);
        }
      }
      if (request.method === 'POST' && url.pathname === '/api/login') {
        if (!sessionSecret(env)) {
          return json({success:false,message:'El acceso seguro no esta configurado',errorType:'CONFIGURACION',errorCode:'AUTH_SECRET_MISSING',requestId},503);
        }
        const body = await request.json();
        const username = String(body.username || '').trim();
        const password = String(body.password || '').trim();
        const found = await findLoginUser(env, username, password);
        if (found) {
          const session = await createSessionToken(env,found);
          const auditPromise = recordSuccessfulLogin(env, found, request);
          if (ctx?.waitUntil) ctx.waitUntil(auditPromise);
          else await auditPromise;
          return json({success:true,token:'active',expiresAt:session.expiresAt,user:found},200,{'Set-Cookie':sessionCookie(request,session.token)});
        }

        return json({ success: false, message: 'Usuario o contraseña incorrectos' }, 401);
      }

      if (request.method === 'POST' && url.pathname === '/api/logout') {
        return json({ok:true},200,{'Set-Cookie':sessionCookie(request,'',0)});
      }

      if (url.pathname === '/api/ping') {
        const meta = await getSyncMeta(env);
        return json({ok:true,time:new Date().toISOString(),storage:'relational-v3',updatedAt:meta.updatedAt});
      }

      const session = await getSession(request,env);
      if (!session) {
        return json({ok:false,success:false,error:'La sesion vencio o no es valida',errorType:'AUTENTICACION',errorCode:'UNAUTHORIZED',requestId},401,{'Set-Cookie':sessionCookie(request,'',0)});
      }

      if (request.method === 'GET' && url.pathname === '/api/session') {
        return json({ok:true,user:{id:session.sub,name:session.name,username:session.username,role:session.role},expiresAt:new Date(session.exp*1000).toISOString()});
      }

      if (request.method === 'GET' && url.pathname === '/api/data') {
        const part = String(url.searchParams.get('part') || '').trim();
        if (!part) {
          return json({
            ok: false,
            error: 'La carga completa de datos fue deshabilitada para proteger el Worker. Actualiza la pagina para usar la carga por secciones.',
            errorType: 'DATOS_INVALIDOS',
            errorCode: 'DATA_PART_REQUIRED',
            requestId
          }, 400);
        }
        const page = {};
        for (const key of ['offset','limit','paged','windowed','scoped','id','q','status','type','zone','priority','category','creator','sort','stockStatus','from','to','user','action','role','includeRelated','includeMapCatalog','equipmentIds','nodeIds','north','south','east','west','detailKind']) {
          const value = url.searchParams.get(key);
          if (value !== null && value !== '') page[key] = value;
        }
        if (part === 'audit') {
          page.viewerRole = String(session.role||'').trim().toLowerCase()==='admin'?'administrador':String(session.role||'').trim().toLowerCase();
          page.viewerId = session.sub;
          page.hidePrincipal = '1';
        }
        if (part === 'people') {
          page.hidePrincipal = '1';
        }
        if (part === 'planning') {
          page.viewerRole = String(session.role||'').trim().toLowerCase()==='admin'?'administrador':String(session.role||'').trim().toLowerCase();
          page.viewerId = session.sub;
        }
        const data = sanitizeDataForSession(await loadStatePart(env,part,page),session);
        if (url.searchParams.get('includeSyncMeta') === '1' && !data.syncMeta) {
          data.syncMeta = await getSyncMeta(env);
        }
        data.__serverTime = new Date().toISOString();
        return json(data);
      }

      if (request.method === 'GET' && url.pathname === '/api/sync-meta') {
        return json({ ok: true, ...(await getSyncMeta(env)) });
      }

      if (request.method === 'GET' && url.pathname === '/api/dashboard-goal') {
        if (!hasRole(session,'administrador','admin','atencion_clientes')) return forbidden(requestId);
        return json({ok:true,...(await getDashboardGoal(env))});
      }

      if (request.method === 'POST' && url.pathname === '/api/dashboard-goal') {
        if (!isPrincipalAdministrator(session)) return forbidden(requestId);
        const body=await request.json();
        const monthlyGoal=Number(body?.monthlyGoal);
        if(!Number.isInteger(monthlyGoal)||monthlyGoal<1||monthlyGoal>100000) return json({ok:false,error:'La meta mensual debe ser un entero entre 1 y 100000',errorType:'DATOS_INVALIDOS',errorCode:'INVALID_DASHBOARD_GOAL',requestId},400);
        return json({ok:true,...(await setDashboardGoal(env,monthlyGoal))});
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/evidence/')) {
        const id = decodeURIComponent(url.pathname.replace('/api/evidence/', ''));
        const dataUrl = await getEvidenceDataUrl(env, id);
        if (!dataUrl) return json({ ok:false,error:'Evidencia no encontrada' },404);
        return dataUrlToImageResponse(dataUrl);
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/material-photo/')) {
        const id = decodeURIComponent(url.pathname.replace('/api/material-photo/', ''));
        const dataUrl = await getMaterialPhotoDataUrl(env, id);
        if (!dataUrl) return json({ ok:false,error:'Foto de material no encontrada' },404);
        return dataUrlToImageResponse(dataUrl);
      }

      if (request.method === 'POST' && url.pathname === '/api/work-orders/review-exit') {
        if (!hasRole(session,'administrador','admin')) return forbidden(requestId);
        const body = await request.json();
        const result = await recordWorkOrderReviewExit(env,body?.orderId,{id:session.sub,name:session.name,username:session.username});
        return json({ok:true,...result});
      }

      if (request.method === 'POST' && url.pathname === '/api/data') {
        if (!hasRole(session,'administrador','admin')) return forbidden(requestId);
        const body = await request.json();
        if(Object.prototype.hasOwnProperty.call(body||{},'users')&&!isPrincipalAdministrator(session)) return forbidden(requestId);
        const time = await saveFullState(env, body || {});
        return json({ ok:true,time });
      }

      if (request.method === 'POST' && url.pathname === '/api/record') {
        const body = await request.json();
        const listKey = String(body?.listKey || '').trim();
        const record = body?.record;
        if (!LIST_KEYS.has(listKey) || !record || typeof record !== 'object' || !record.id) {
          return json({ ok:false,error:'Parametros invalidos',errorType:'DATOS_INVALIDOS',errorCode:'INVALID_RECORD',requestId },400);
        }
        if (listKey === 'users' && !isPrincipalAdministrator(session)) return forbidden(requestId);
        const result = await upsertRecord(env,listKey,record);
        return json({ ok:true,time:result.time,record:result.record });
      }

      if (request.method === 'POST' && url.pathname === '/api/delete-record') {
        if (!hasRole(session,'administrador','admin')) return forbidden(requestId);
        const body=await request.json();
        if(String(body?.listKey||'')==='users'&&!isPrincipalAdministrator(session)) return forbidden(requestId);
        const time=await deleteRecord(env,String(body?.listKey||''),String(body?.id||''));
        return json({ok:true,time});
      }

      if (request.method === 'POST' && url.pathname === '/api/work-order-report') {
        const body = await request.json();
        const result = await upsertWorkOrderReport(env,body?.workOrder);
        return json({ ok:true,time:result.time,workOrder:result.record });
      }

      if (request.method === 'POST' && url.pathname === '/api/changes') {
        const body = await request.json();
        if (!isPrincipalAdministrator(session) && (body?.changes||[]).some(change=>String(change?.key||'')==='users')) return forbidden(requestId);
        const result = await applyChanges(env,body?.changes||[]);
        return json({ ok:true,time:result.time,touched:result.touched });
      }

      if (request.method === 'POST' && url.pathname === '/api/plans/delete') {
        if (!hasRole(session,'administrador','admin')) return forbidden(requestId);
        const body = await request.json();
        const ids = Array.isArray(body?.ids) ? body.ids : [];
        if (!ids.length) return json({ ok:false,error:'Debes indicar al menos un plan',errorType:'DATOS_INVALIDOS',errorCode:'MISSING_PLAN_IDS',requestId },400);
        const result = await deletePlans(env,ids);
        return json({ ok:true,time:result.time,deletedIds:result.deletedIds });
      }

      return json({ error: 'Ruta no encontrada' }, 404);
    } catch (err) {
      const failure = classifyApiError(err);
      console.error(JSON.stringify({ event:'api_error',requestId,path:url.pathname,errorType:failure.type,errorCode:failure.code,message:err?.message || String(err) }));
      return json({ ok:false,success:false,error:err?.message || String(err),errorType:failure.type,errorCode:failure.code,requestId },failure.status);
    }
  }
};
