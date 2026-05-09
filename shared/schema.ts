/**
 * EPHANTOM Shared Schema Definitions
 */

export const TrackSchema = {
  id: 'number',
  title: 'string',
  artist: 'string',
  url: 'string',
  embedUrl: 'string',
  votes: 'number',
  bpm: 'number',
  genre: 'string',
  createdAt: 'string'
};

export const VoteSchema = {
  trackId: 'number',
  address: 'string',
  timestamp: 'string'
};

export const CycleSchema = {
  id: 'number',
  phase: 'string',
  submission_end: 'number',
  vote_start: 'number',
  vote_end: 'number',
  min_quorum: 'number',
  current_voters: 'number',
  quorum_met: 'boolean'
};
