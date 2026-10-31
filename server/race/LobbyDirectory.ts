import type { LobbyRules } from '../../src/shared/lobby';
export interface PublicLobby { roomId: string; title: string; seats: number; present: number; contactsEnabled: boolean }
export class LobbyDirectory {
  private rooms = new Map<string, { public: PublicLobby; code: string; visibility: LobbyRules['visibility']; joinable: boolean }>();
  set(roomId: string, code: string, visibility: LobbyRules['visibility'], entry: Omit<PublicLobby, 'roomId'>, joinable: boolean): void {
    this.rooms.set(roomId, { public: { roomId, ...entry }, code, visibility, joinable });
  }
  remove(id: string): void { this.rooms.delete(id); }
  listPublic(): PublicLobby[] { return [...this.rooms.values()].filter(r => r.visibility === 'public' && r.joinable).map(r => ({ ...r.public })); }
  resolveCode(code: string): string | null {
    return [...this.rooms.entries()].find(([, r]) => r.code === code && r.joinable)?.[0] ?? null;
  }
}
