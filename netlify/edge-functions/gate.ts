import type { Config, Context } from "@netlify/edge-functions";
import { getStore } from "@netlify/blobs";

const SESSION_COOKIE = "curso_session";
const ADMIN_COOKIE = "admin_session";
const AUTH_PATH = "/__auth";
const ADMIN_CLIENTS_PATH = "/admin/clientes";
const ADMIN_CLIENTS_API = "/__admin_clients";
const SESSION_HOURS = 16;
const ADMIN_SESSION_HOURS = 8;
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 10;
const RESERVED_SLUGS = ["admin", "auth"];

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function b64url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const payloadB64 = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${b64url(new Uint8Array(sig))}`;
}

async function verifyToken(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  const key = await hmacKey(secret);
  const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  if (b64url(new Uint8Array(expectedSig)) !== sigB64) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function safeRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function clientSlugFor(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (!seg || RESERVED_SLUGS.includes(seg) || seg.startsWith("__")) return "default";
  return seg;
}

function passwordStore() {
  return getStore({ name: "client-passwords", consistency: "strong" });
}

function rateLimitStore() {
  return getStore({ name: "rate-limit", consistency: "strong" });
}

async function isRateLimited(ip: string, scope: string): Promise<boolean> {
  const raw = await rateLimitStore().get(`${ip}:${scope}`);
  if (!raw) return false;
  const data = JSON.parse(raw);
  const windowStart = Date.now() - WINDOW_MINUTES * 60 * 1000;
  return data.first >= windowStart && data.count >= MAX_ATTEMPTS;
}

async function recordFailure(ip: string, scope: string): Promise<void> {
  const store = rateLimitStore();
  const key = `${ip}:${scope}`;
  const raw = await store.get(key);
  const now = Date.now();
  const windowStart = now - WINDOW_MINUTES * 60 * 1000;
  const data = raw && JSON.parse(raw).first >= windowStart ? JSON.parse(raw) : { first: now, count: 0 };
  data.count += 1;
  await store.set(key, JSON.stringify(data));
}

async function clearFailures(ip: string, scope: string): Promise<void> {
  await rateLimitStore().delete(`${ip}:${scope}`);
}

function pageShellHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0f1115;color:#eee;margin:0;padding:24px;min-height:100vh;box-sizing:border-box;}
  .wrap{max-width:480px;margin:40px auto;}
  .card{background:#1b1e26;padding:32px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.4);margin-bottom:16px;}
  h1{font-size:18px;margin:0 0 16px;}
  input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid #333;background:#0f1115;color:#eee;font-size:15px;margin-bottom:10px;}
  button{padding:10px 16px;border-radius:8px;border:none;background:#4f7cff;color:#fff;font-size:14px;cursor:pointer;}
  button.danger{background:#b3392f;}
  .err{color:#ff6b6b;font-size:13px;margin-bottom:12px;}
  .ok{color:#63d47a;font-size:13px;margin-bottom:12px;}
  .row{display:flex;gap:8px;align-items:center;margin-bottom:8px;}
  .row span{flex:1;font-family:monospace;}
  a{color:#9db4ff;}
</style></head>
<body><div class="wrap">${body}</div></body></html>`;
}

function pageShell(title: string, body: string): Response {
  return new Response(pageShellHtml(title, body), { headers: { "content-type": "text/html; charset=utf-8" } });
}

function loginPage(opts: { title: string; error?: string; action: string; hiddenScope: string }): Response {
  const body = `<div class="card">
<form method="POST" action="${esc(opts.action)}">
  <h1>${esc(opts.title)}</h1>
  ${opts.error ? `<div class="err">${esc(opts.error)}</div>` : ""}
  <input type="hidden" name="scope" value="${esc(opts.hiddenScope)}">
  <input type="password" name="password" placeholder="Contraseña" autofocus required>
  <button type="submit">Entrar</button>
</form>
</div>`;
  return new Response(pageShellHtml(opts.title, body), {
    status: 401,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function clientsManagementPage(message?: { ok?: string; err?: string }): Promise<Response> {
  const store = passwordStore();
  const list = await store.list();
  const rows = list.blobs
    .map((b) => {
      const slug = esc(b.key);
      return `<div class="row">
        <span>${slug}</span>
        <form method="POST" action="${ADMIN_CLIENTS_API}" style="display:flex;gap:6px;flex:2;">
          <input type="hidden" name="action" value="update">
          <input type="hidden" name="slug" value="${slug}">
          <input type="password" name="password" placeholder="Nueva contraseña" required style="margin:0;">
          <button type="submit">Guardar</button>
        </form>
        <form method="POST" action="${ADMIN_CLIENTS_API}" onsubmit="return confirm('¿Eliminar este cliente?');">
          <input type="hidden" name="action" value="delete">
          <input type="hidden" name="slug" value="${slug}">
          <button type="submit" class="danger">Eliminar</button>
        </form>
      </div>`;
    })
    .join("") || `<p style="opacity:.7;">Todavía no hay ningún cliente configurado.</p>`;

  const body = `
  <div class="card">
    <h1>Panel de administrador — Clientes</h1>
    ${message?.ok ? `<div class="ok">${esc(message.ok)}</div>` : ""}
    ${message?.err ? `<div class="err">${esc(message.err)}</div>` : ""}
    <p style="opacity:.7;font-size:13px;">Cada fila es un cliente. El nombre (slug) define la carpeta pública, ej: <code>cliente-a</code> corresponde a <code>curso.emcomplianceuy.com/cliente-a/</code>. La carpeta "default" es la raíz del sitio.</p>
    ${rows}
  </div>
  <div class="card">
    <h1>Agregar cliente nuevo</h1>
    <form method="POST" action="${ADMIN_CLIENTS_API}">
      <input type="hidden" name="action" value="create">
      <input type="text" name="slug" placeholder="nombre-cliente (solo letras, números y guiones)" pattern="[a-z0-9-]{1,40}" required>
      <input type="password" name="password" placeholder="Contraseña para este cliente" required>
      <button type="submit">Crear</button>
    </form>
  </div>
  <p><a href="/admin">&larr; Volver al curso (modo admin)</a></p>`;
  return pageShell("Panel de administrador — Clientes", body);
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const SESSION_SECRET = Netlify.env.get("SESSION_SECRET") || "";
  const ADMIN_PASSWORD = Netlify.env.get("ADMIN_PASSWORD") || "";
  const ip = context.ip || "0.0.0.0";

  async function validAdminSession(): Promise<boolean> {
    const cookie = context.cookies.get(ADMIN_COOKIE);
    if (!cookie) return false;
    const payload = await verifyToken(cookie, SESSION_SECRET);
    return !!payload && payload.scope === "admin";
  }

  // --- Login form submission ---
  if (url.pathname === AUTH_PATH && req.method === "POST") {
    const form = await req.formData();
    const password = String(form.get("password") || "");
    const scope = String(form.get("scope") || "default");
    const isAdmin = scope === "admin";
    const redirectTo = safeRedirect(url.searchParams.get("redirect"));

    if (await isRateLimited(ip, scope)) {
      return loginPage({
        title: isAdmin ? "Panel de administrador" : "Acceso al curso",
        error: "Demasiados intentos fallidos. Probá de nuevo en unos minutos.",
        action: `${AUTH_PATH}?redirect=${encodeURIComponent(redirectTo)}`,
        hiddenScope: scope,
      });
    }

    let ok = false;
    let storedExists = true;
    if (isAdmin) {
      ok = ADMIN_PASSWORD.length > 0 && password === ADMIN_PASSWORD;
    } else {
      const stored = await passwordStore().get(scope);
      storedExists = stored !== null;
      ok = stored !== null && password === stored;
    }

    if (!ok) {
      await recordFailure(ip, scope);
      return loginPage({
        title: isAdmin ? "Panel de administrador" : "Acceso al curso",
        error: storedExists
          ? "Contraseña incorrecta."
          : "Este curso todavía no tiene una contraseña configurada. Contactá al administrador.",
        action: `${AUTH_PATH}?redirect=${encodeURIComponent(redirectTo)}`,
        hiddenScope: scope,
      });
    }

    await clearFailures(ip, scope);
    const hours = isAdmin ? ADMIN_SESSION_HOURS : SESSION_HOURS;
    const token = await signToken({ scope, exp: Date.now() + hours * 60 * 60 * 1000 }, SESSION_SECRET);
    const res = new Response(null, { status: 302, headers: { location: redirectTo } });
    res.headers.append(
      "set-cookie",
      `${isAdmin ? ADMIN_COOKIE : SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${hours * 3600}`,
    );
    return res;
  }

  // --- Admin-only: client password management UI + API ---
  if (url.pathname === ADMIN_CLIENTS_PATH || url.pathname === ADMIN_CLIENTS_API) {
    if (!(await validAdminSession())) {
      return loginPage({
        title: "Panel de administrador",
        action: `${AUTH_PATH}?redirect=${encodeURIComponent(url.pathname)}`,
        hiddenScope: "admin",
      });
    }

    if (url.pathname === ADMIN_CLIENTS_API && req.method === "POST") {
      const form = await req.formData();
      const action = String(form.get("action") || "");
      const slug = String(form.get("slug") || "").toLowerCase().trim();
      const password = String(form.get("password") || "");
      const validSlug = /^[a-z0-9-]{1,40}$/.test(slug) && !RESERVED_SLUGS.includes(slug);

      let message: { ok?: string; err?: string } = {};
      if (!validSlug) {
        message = { err: "Nombre de cliente inválido (solo letras minúsculas, números y guiones)." };
      } else if (action === "delete") {
        await passwordStore().delete(slug);
        message = { ok: `Cliente "${slug}" eliminado.` };
      } else if ((action === "create" || action === "update") && password.length > 0) {
        await passwordStore().set(slug, password);
        message = { ok: `Contraseña de "${slug}" guardada.` };
      } else {
        message = { err: "Faltan datos." };
      }
      return clientsManagementPage(message);
    }

    return clientsManagementPage();
  }

  // --- /admin: unlock the in-page admin panel of the course itself ---
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
    if (!(await validAdminSession())) {
      return loginPage({
        title: "Panel de administrador",
        action: `${AUTH_PATH}?redirect=${encodeURIComponent(url.pathname)}`,
        hiddenScope: "admin",
      });
    }
    const rewritten = new URL(req.url);
    rewritten.pathname = "/index.html";
    const response = await context.next(new Request(rewritten.toString(), { headers: req.headers }));
    return injectFlag(response, true);
  }

  // --- Everything else: gate by the general client password for this path's slug ---
  const scope = clientSlugFor(url.pathname);
  const sessionCookie = context.cookies.get(SESSION_COOKIE);
  const payload = sessionCookie ? await verifyToken(sessionCookie, SESSION_SECRET) : null;
  const hasValidSession = payload && payload.scope === scope;

  if (!hasValidSession) {
    return loginPage({
      title: "Acceso al curso",
      action: `${AUTH_PATH}?redirect=${encodeURIComponent(url.pathname)}`,
      hiddenScope: scope,
    });
  }

  const response = await context.next();
  return injectFlag(response, false);
};

async function injectFlag(response: Response, adminUnlocked: boolean): Promise<Response> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;
  const html = await response.text();
  const flagScript = `<script>window.__ADMIN_UNLOCKED__=${adminUnlocked};</script>`;
  const injected = html.includes("</head>") ? html.replace("</head>", `${flagScript}</head>`) : flagScript + html;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(injected, { status: response.status, statusText: response.statusText, headers });
}

export const config: Config = {
  path: "/*",
};
