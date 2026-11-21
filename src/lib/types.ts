/** Domain types shared by server + client. Mirrors supabase/migrations/0001_init.sql. */

export type ID = string;
export type ISO = string;

export type User = {
  id: ID;
  wallet: string; // lowercased, proven by signature
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: ISO;
};

export type AgentMode = "manual" | "assisted" | "autonomous";

export type AgentPermissions = {
  canDraftClips: boolean;
  canPublishClips: boolean; // only effective in autonomous mode, and only for non-financial publish
  canDraftTokens: boolean;
  /** Financial autonomy is hard-disabled platform-wide. Kept for schema completeness. */
  canLaunchTokens: false;
  paused: boolean;
};

export type AgentPreferences = {
  clipMinSec: number;
  clipMaxSec: number;
  suggestions: number;
  category: string;
  captionStyle: "bold" | "minimal" | "karaoke";
  aspect: "9:16" | "16:9" | "1:1";
  autoDraft: boolean;
  notifyOnDraft: boolean;
};

/** Off-chain profile — user supplied, NOT verified. */
export type Agent = {
  id: ID;
  slug: string;
  operatorId: ID;
  name: string;
  description: string;
  avatarHue: number;
  mode: AgentMode;
  permissions: AgentPermissions;
  preferences: AgentPreferences;
  createdAt: ISO;
};

/** Verified on-chain identity record — written only by the server after an RPC check. */
export type AgentIdentity = {
  id: ID;
  agentId: ID;
  ownerWallet: string;
  registry: string;
  chainId: number;
  balance: string;
  verifiedAtBlock: string;
  verifiedAt: ISO;
  status: "verified" | "revoked";
  /** Optional .ai name the operator claims — displayed as unverified label. */
  claimedName: string | null;
};

export type VideoAsset = {
  id: ID;
  ownerId: ID;
  agentId: ID | null;
  filename: string;
  mime: string;
  bytes: number;
  durationSec: number | null;
  storagePath: string;
  rightsAttested: boolean;
  status: "uploaded" | "processing" | "ready" | "failed";
  createdAt: ISO;
};

export type JobStatus = "queued" | "analyzing" | "ranking" | "completed" | "failed";

export type ProcessingJob = {
  id: ID;
  assetId: ID;
  agentId: ID | null;
  ownerId: ID;
  status: JobStatus;
  stage: string;
  progress: number;
  error: string | null;
  signalsSummary: Record<string, number> | null;
  idempotencyKey: string;
  createdAt: ISO;
  updatedAt: ISO;
};

export type ClipCandidate = {
  id: ID;
  jobId: ID;
  assetId: ID;
  startSec: number;
  endSec: number;
  score: number;
  reasons: string[];
  suggestedTitle: string;
  status: "suggested" | "draft" | "published" | "rejected";
  createdAt: ISO;
};

export type Clip = {
  id: ID;
  candidateId: ID | null;
  assetId: ID;
  agentId: ID | null;
  creatorId: ID;
  title: string;
  caption: string;
  category: string;
  startSec: number;
  endSec: number;
  aspect: "9:16" | "16:9" | "1:1";
  thumbnailPath: string | null;
  status: "draft" | "published" | "removed";
  likes: number;
  views: number;
  createdAt: ISO;
  publishedAt: ISO | null;
};

export type TokenDraft = {
  id: ID;
  clipId: ID;
  creatorId: ID;
  agentId: ID | null;
  name: string;
  symbol: string;
  description: string;
  links: { x?: string; telegram?: string; website?: string };
  status: "draft" | "submitted" | "confirmed" | "failed";
  createdAt: ISO;
};

export type LaunchAttempt = {
  id: ID;
  draftId: ID;
  creatorId: ID;
  chainId: number;
  txHash: string;
  status: "pending" | "confirmed" | "reverted" | "unknown";
  error: string | null;
  createdAt: ISO;
  updatedAt: ISO;
};

export type TokenLaunch = {
  id: ID;
  draftId: ID;
  clipId: ID;
  agentId: ID | null;
  creatorId: ID;
  chainId: number;
  tokenAddress: string;
  txHash: string;
  blockNumber: string;
  name: string;
  symbol: string;
  confirmedAt: ISO;
};

export type ActivityKind =
  | "agent.registered"
  | "agent.identity_verified"
  | "job.completed"
  | "highlight.identified"
  | "clip.published"
  | "token.draft_created"
  | "token.launch_confirmed"
  | "clip.removed";

export type ActivityEvent = {
  id: ID;
  agentId: ID | null;
  actorId: ID | null;
  kind: ActivityKind;
  message: string;
  ref: Record<string, string> | null;
  createdAt: ISO;
};

export type ReputationEvent = {
  id: ID;
  agentId: ID;
  kind: "job_success" | "job_failure" | "clip_published" | "launch_confirmed" | "clip_removed" | "engagement";
  delta: number;
  createdAt: ISO;
};

export type ContentReport = {
  id: ID;
  clipId: ID | null;
  reporterId: ID | null;
  reason: "copyright" | "spam" | "harmful" | "misleading" | "other";
  details: string;
  status: "open" | "actioned" | "dismissed";
  createdAt: ISO;
};

export type AuditLog = {
  id: ID;
  actorId: ID | null;
  action: string;
  target: string;
  meta: Record<string, unknown> | null;
  createdAt: ISO;
};

export type EngagementEvent = {
  id: ID;
  clipId: ID;
  userId: ID | null;
  kind: "view" | "like" | "share";
  createdAt: ISO;
};

/* ─── Public projections ─── */

export type PublicAgent = {
  id: ID;
  slug: string;
  name: string;
  description: string;
  avatarHue: number;
  mode: AgentMode;
  operatorWallet: string;
  identity: { verified: boolean; ownerWallet: string | null; registry: string | null; verifiedAt: ISO | null; claimedName: string | null };
  stats: { clips: number; views: number; launches: number; jobsOk: number; jobsFailed: number; reputation: number };
  recent: ActivityEvent[];
  createdAt: ISO;
};

export type PublicClip = {
  id: ID;
  title: string;
  caption: string;
  category: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  startSec: number;
  endSec: number;
  aspect: Clip["aspect"];
  likes: number;
  views: number;
  creatorWallet: string;
  agent: { id: ID; slug: string; name: string; verified: boolean; avatarHue: number } | null;
  token: { address: string; symbol: string; name: string; chainId: number } | null;
  publishedAt: ISO | null;
};
