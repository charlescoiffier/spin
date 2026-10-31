export function parseJoinLink(url: string): { code: string } | null {
  try { const code = new URL(url).searchParams.get('partie'); return code && /^[A-Za-z0-9_-]{12}$/.test(code) ? { code } : null; }
  catch { return null; }
}
export function makeJoinLink(url: string, code: string): string {
  const target = new URL(url); target.search = ''; target.hash = ''; target.searchParams.set('partie', code); return target.href;
}
export function hasRecentRejoin(): boolean {
  try { const saved = JSON.parse(sessionStorage.getItem('spin:rejoin') ?? 'null'); return !!saved?.token && Date.now() - saved.at <= 30000; } catch { return false; }
}
