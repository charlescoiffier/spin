import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import { createRaceRoom, type RoomServices } from './race/RaceRoom';
import type { SupabaseIdentityVerifier } from './auth/IdentityVerifier';
export function createServer(services: RoomServices, origins: string[], guests?: SupabaseIdentityVerifier) {
  const transport = new WebSocketTransport({ maxPayload: 16_384, beforeUpgrade: context => {
    const origin = context.headers.get('origin');
    if (origin && !origins.includes(String(origin))) return new Response('Origin refused', { status: 403 });
  } });
  const server = new Server({ transport, greet: false, gracefullyShutdown: false, express: app => {
    app.use(express.json({ limit: '16kb' }));
    app.get('/health', (_req, res) => res.json({ ok: true, protocol: 1 }));
    app.get('/api/lobbies', (_req, res) => res.json(services.directory.listPublic()));
    app.get('/api/invite/:code', (req, res) => {
      const roomId = services.directory.resolveCode(req.params.code);
      if (!roomId) res.status(404).json({ error: 'Partie introuvable ou déjà lancée' });
      else res.json({ roomId });
    });
    app.post('/api/guest', (req, res) => {
      if (!guests || typeof req.body?.name !== 'string') { res.status(400).json({ error: 'Pseudo requis' }); return; }
      try { res.json(guests.createGuest(req.body.name)); } catch { res.status(503).json({ error: 'Réessayez plus tard' }); }
    });
  } });
  server.define('race', createRaceRoom(services));
  async function start(port: number, hostname = '0.0.0.0') {
    await server.listen(port, hostname);
    // Colyseus dispatches matchmaking before Express. Protect that dispatcher too.
    const http = transport.server!;
    const handlers = http.listeners('request'); http.removeAllListeners('request');
    const windows = new Map<string, { count: number; until: number }>();
    http.on('request', (req, res) => {
      if (req.url?.startsWith('/matchmake/')) {
        // Colyseus puts application codes (520–526) in the HTTP status.
        // Edge proxies interpret 522/523 as infrastructure failures and replace
        // the JSON body with HTML. Keep application codes in JSON, use real HTTP here.
        const httpStatus: Record<number, number> = { 520: 404, 521: 400, 522: 404, 523: 500, 524: 409, 525: 401, 526: 400 };
        const writeHead = res.writeHead;
        res.writeHead = function (this: import('node:http').ServerResponse, code: number, ...args: unknown[]) {
          return Reflect.apply(writeHead, this, [httpStatus[code] ?? code, ...args]);
        };
      }
      const origin = req.headers.origin;
      if (origin && !origins.includes(origin)) { res.writeHead(403); res.end('Origin refused'); return; }
      const now = Date.now();
      for (const [key, w] of windows) if (w.until < now) windows.delete(key);
      const key = req.socket.remoteAddress ?? 'unknown', w = windows.get(key) ?? { count: 0, until: now + 60_000 };
      if (++w.count > 120 || windows.size > 10000) { res.writeHead(429); res.end('Too many requests'); return; }
      windows.set(key, w);
      if (Number(req.headers['content-length'] ?? 0) > 16384) { res.writeHead(413); res.end('Payload too large'); return; }
      let bytes = 0;
      req.on('data', (chunk: Buffer) => { bytes += chunk.length; if (bytes > 16384) { res.writeHead(413); res.end(); req.destroy(); } });
      for (const handler of handlers) handler.call(http, req, res);
    });
  }
  return { server, transport, start };
}
