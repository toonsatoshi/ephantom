import { createDefaultUser } from './state';

export interface StateRepository {
  getCycle(): Promise<any>;
  getTracks(): Promise<any[]>;
  getEntities(): Promise<any[]>;
  getUser(address: string): Promise<any>;
  vote(address: string, trackId: number): Promise<{ track: any; cycle: any; user: any }>;
  forge(track: any): Promise<any>;
}

export class InMemoryRepository implements StateRepository {
  protected state: any;

  constructor(initialState: any) {
    this.state = initialState;
  }

  async getCycle() {
    return this.state.cycle;
  }

  async getTracks() {
    return this.state.tracks;
  }

  async getEntities() {
    return this.state.entities;
  }

  async getUser(address: string) {
    if (!this.state.users[address]) {
      this.state.users[address] = createDefaultUser(address);
    }
    return this.state.users[address];
  }

  async vote(address: string, trackId: number) {
    const user = await this.getUser(address);
    const track = this.state.tracks.find((t: any) => t.id === trackId);
    if (!track) throw new Error('TRACK_NOT_FOUND');
    if (user.votes_this_cycle.includes(trackId)) throw new Error('ALREADY_VOTED');

    track.votes += 1;
    track.rep_weight += user.reputation;
    user.votes_this_cycle.push(trackId);
    
    this.state.cycle.current_voters++;
    this.state.cycle.quorum_met = this.state.cycle.current_voters >= this.state.cycle.min_quorum;

    return { track, cycle: this.state.cycle, user };
  }

  async forge(track: any) {
    this.state.tracks.push(track);
    return track;
  }

  getState() {
    return this.state;
  }
}

/**
 * Cloudflare KV Repository implementation.
 * Assumes state is stored as a single JSON blob for simplicity in this prototype.
 */
export class KVRepository implements StateRepository {
  private kv: any;
  private key: string;
  private initialState: any;

  constructor(kv: any, initialState: any, key: string = 'state') {
    this.kv = kv;
    this.initialState = initialState;
    this.key = key;
  }

  private async _load() {
    const data = await this.kv.get(this.key);
    return data ? JSON.parse(data) : this.initialState;
  }

  private async _save(state: any) {
    await this.kv.put(this.key, JSON.stringify(state));
  }

  async getCycle() {
    const state = await this._load();
    return state.cycle;
  }

  async getTracks() {
    const state = await this._load();
    return state.tracks;
  }

  async getEntities() {
    const state = await this._load();
    return state.entities;
  }

  async getUser(address: string) {
    const state = await this._load();
    if (!state.users[address]) {
      state.users[address] = createDefaultUser(address);
      await this._save(state);
    }
    return state.users[address];
  }

  async vote(address: string, trackId: number) {
    const state = await this._load();
    const user = state.users[address] || (state.users[address] = createDefaultUser(address));
    const track = state.tracks.find((t: any) => t.id === trackId);
    
    if (!track) throw new Error('TRACK_NOT_FOUND');
    if (user.votes_this_cycle.includes(trackId)) throw new Error('ALREADY_VOTED');

    track.votes += 1;
    track.rep_weight += user.reputation;
    user.votes_this_cycle.push(trackId);
    
    state.cycle.current_voters++;
    state.cycle.quorum_met = state.cycle.current_voters >= state.cycle.min_quorum;

    await this._save(state);
    return { track, cycle: state.cycle, user };
  }

  async forge(track: any) {
    const state = await this._load();
    state.tracks.push(track);
    await this._save(state);
    return track;
  }
}
