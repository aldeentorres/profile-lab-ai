"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FolderOpen,
  History,
  Inbox,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { designerStore, type DesignerSnapshot } from "../designer-store";
import { photoCategoryBadge } from "../atlas-profile-photo";
import {
  DesignerCaseStatus,
  agentPhotoSummary,
  groupAgentsByTeam,
  isPhotoReminderEligible,
  matchesDesignerSearch,
  overviewCounts,
  photoReminderRecipient,
  sanitiseApprovedFilename,
  sortAgentsByPhotoState,
  type AgentPhotoState,
  type DesignerAction,
  type DesignerAgent,
  type DesignerAsset,
  type DesignerEnhancement,
  type DesignerSubmission,
  type PhotoReminder,
} from "../designer-records";
import {
  createPhotoZip,
  currentDownloadableAsset,
} from "../bulk-photo-actions";
import { agentPresentation } from "../agent-directory";

type Section = "overview" | "queue" | "assets" | "directory" | "history";
const pendingStatuses = new Set([
  DesignerCaseStatus.PENDING_DESIGNER_APPROVAL,
  DesignerCaseStatus.AI_ENHANCED_REVIEW,
  DesignerCaseStatus.DESIGNER_REVIEW_REQUESTED,
]);
const empty: DesignerSnapshot = {
  submissions: [],
  enhancements: [],
  reviews: [],
  assets: [],
  events: [],
  agents: [],
  reminders: [],
};
const dateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};
const sourceLabel = {
  original: "Original",
  ai_enhanced: "AI enhanced",
  background_removed: "Background removed",
};
// What the agent wants the photo for. "other" (subsale banner and the rest) carries no badge: only the
// two slots a designer has to keep apart — the live Atlas profile photo and an awards-night entry — do.
// A photo filed for both is named as both so the desk never hides one of those slots.
type LibraryImage = {
  key: string;
  agentId: string;
  imageId: string;
  sourceType: "original" | "ai_enhanced" | "background_removed";
  status: "pending" | "approved" | "retake" | "reupload" | "uploaded";
  category?: string;
  score: number;
  at: string;
  asset?: DesignerAsset;
};

function StoredImage({ imageId, alt }: { imageId: string; alt: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true,
      objectUrl = "";
    designerStore()
      .image(imageId)
      .then((blob) => {
        if (!active || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((error) =>
        console.error("Designer image could not be loaded", error),
      );
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);
  return url /* IndexedDB image Blobs stay local and cannot use the framework's URL image loader. */ ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} />
  ) : (
    <div className="designer-image-loading">
      <LoaderCircle className="spin" size={22} />
      <span>Loading portrait…</span>
    </div>
  );
}
function latestImageByAgent(images: LibraryImage[]) {
  const map = new Map<string, string>();
  for (const item of images)
    if (!map.has(item.agentId)) map.set(item.agentId, item.imageId);
  return map;
}
function agentPreviewId(
  agent: DesignerAgent,
  latest: Map<string, string>,
  assets: DesignerAsset[],
) {
  return (
    currentDownloadableAsset(agent, assets)?.imageId ||
    latest.get(agent.agentId) ||
    ""
  );
}
function AgentAvatar({
  agent,
  imageId,
  size = 19,
}: {
  agent: DesignerAgent;
  imageId: string;
  size?: number;
}) {
  const [remoteFailed, setRemoteFailed] = useState(false),
    photo = Boolean(imageId || (agent.avatarUrl && !remoteFailed));
  return (
    <span className={`designer-avatar${photo ? " has-photo" : ""}`}>
      {imageId ? (
        <StoredImage imageId={imageId} alt="" />
      ) : agent.avatarUrl &&
        !remoteFailed /* IQI directory avatars are remote URLs, not IndexedDB Blobs. */ ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={agent.avatarUrl}
          alt=""
          onError={() => setRemoteFailed(true)}
        />
      ) : (
        <UserRound size={size} />
      )}
    </span>
  );
}

function AccessGate({ onOpen }: { onOpen: () => void }) {
  const [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [checking, setChecking] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setChecking(true);
    setError("");
    try {
      const response = await fetch("/api/designer-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        setError("That access code is not valid.");
        return;
      }
      onOpen();
    } catch {
      setError("Access could not be verified on this device.");
    } finally {
      setChecking(false);
    }
  };
  return (
    <main className="designer-access">
      <section>
        <span className="designer-access-mark">
          <LockKeyhole size={26} />
        </span>
        <span className="eyebrow">INTERNAL DESK</span>
        <h1>Open the portrait desk</h1>
        <p>
          Enter the access code to review portraits and approved brand assets.
        </p>
        <form className={error ? "has-error" : undefined} onSubmit={submit}>
          <label>
            <span>Access code</span>
            <input
              type="password"
              autoComplete="current-password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          {error ? (
            <p role="alert">
              <AlertTriangle size={14} /> {error}
            </p>
          ) : null}
          <button type="submit" disabled={!code || checking}>
            {checking ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <ShieldCheck size={17} />
            )}
            Open dashboard
          </button>
        </form>
      </section>
    </main>
  );
}

export default function Dashboard() {
  const [access, setAccess] = useState<"checking" | "locked" | "open">(
      "checking",
    ),
    [snapshot, setSnapshot] = useState<DesignerSnapshot>(empty),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [section, setSection] = useState<Section>("overview"),
    [query, setQuery] = useState(""),
    [selectedSubmissionId, setSelectedSubmissionId] = useState(""),
    [selectedTeam, setSelectedTeam] = useState(""),
    [selectedAgentId, setSelectedAgentId] = useState(""),
    [directory, setDirectory] = useState<DesignerAgent[]>([]),
    [directoryState, setDirectoryState] = useState<
      "idle" | "loading" | "indexing" | "error"
    >("idle"),
    [progress, setProgress] = useState(0);
  const refresh = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const next = await designerStore().snapshot();
      setSnapshot(next);
      setSelectedSubmissionId((current) =>
        next.submissions.some(
          (item) =>
            item.submissionId === current && pendingStatuses.has(item.status),
        )
          ? current
          : (next.submissions.find((item) => pendingStatuses.has(item.status))
              ?.submissionId ?? ""),
      );
    } catch (cause) {
      console.error("Designer dashboard could not open", cause);
      setError(
        "The local designer library could not be opened. Retry on this device.",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => setAccess("open"), 4000);
    fetch("/api/designer-access", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { required?: boolean }) =>
        setAccess(result.required ? "locked" : "open"),
      )
      .catch(() => setAccess("open"))
      .finally(() => window.clearTimeout(timer));
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (access !== "open") return;
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [access]);
  useEffect(() => {
    if (access !== "open" || section !== "directory") return;
    let active = true;
    const timer = window.setTimeout(
      async () => {
        setDirectoryState("loading");
        try {
          const endpoint = query.trim()
              ? `/api/agents?search=${encodeURIComponent(query.trim())}`
              : "/api/agents?page=1&per_page=24",
            response = await fetch(endpoint, { cache: "no-store" }),
            result = (await response.json()) as {
              agents?: DesignerAgent[];
              indexing?: boolean;
              progress?: number;
              error?: string;
            };
          if (!active) return;
          if (result.indexing) {
            setDirectoryState("indexing");
            setProgress(result.progress ?? 0);
            setDirectory([]);
          } else if (!response.ok) {
            throw new Error(result.error || "Directory unavailable");
          } else {
            setDirectory(result.agents ?? []);
            setDirectoryState("idle");
            setProgress(100);
            void designerStore()
              .cacheAgents(result.agents ?? [])
              .catch(() => {});
          }
        } catch (cause) {
          if (active) {
            console.error("Agent directory failed", cause);
            setDirectoryState("error");
            setDirectory([]);
          }
        }
      },
      query.trim() ? 350 : 0,
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [access, query, section]);
  if (access === "checking")
    return (
      <main className="designer-boot">
        <LoaderCircle className="spin" size={24} />
        <b>Profile Lab AI Designer</b>
        <span>Preparing designer desk…</span>
      </main>
    );
  if (access === "locked")
    return <AccessGate onOpen={() => setAccess("open")} />;
  const counts = overviewCounts(snapshot.submissions),
    pending = snapshot.submissions.filter((item) =>
      pendingStatuses.has(item.status),
    ),
    selectedSubmission =
      snapshot.submissions.find(
        (item) => item.submissionId === selectedSubmissionId,
      ) ?? pending[0],
    selectedEnhancement = snapshot.enhancements.find(
      (item) => item.submissionId === selectedSubmission?.submissionId,
    ),
    hasRecords = Boolean(
      snapshot.submissions.length ||
        snapshot.assets.length ||
        snapshot.events.length,
    ),
    images = libraryImages(snapshot),
    localResults = snapshot.agents.filter((agent) =>
      matchesDesignerSearch(agent, query),
    );
  const navigate = (next: Section) => {
    setSection(next);
    setSelectedAgentId("");
  };
  const nav = [
    {
      id: "overview" as const,
      label: "Overview",
      icon: LayoutDashboard,
      count: 0,
    },
    {
      id: "queue" as const,
      label: "Review queue",
      icon: Inbox,
      count: counts.pending,
    },
    {
      id: "assets" as const,
      label: "Photo library",
      icon: FolderOpen,
      count: images.length,
    },
    {
      id: "directory" as const,
      label: "Agent directory",
      icon: Users,
      count: 0,
    },
    { id: "history" as const, label: "History", icon: History, count: 0 },
  ];
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSection("directory");
    setSelectedAgentId("");
  };
  return (
    <main className="designer-app">
      <aside className="designer-sidebar">
        <Link
          href="/"
          className="designer-brand"
          aria-label="Profile Lab AI home"
        >
          <img src="/profile-lab-logo.svg" alt="" width={219} height={200} />
          <span>Designer</span>
        </Link>
        <nav aria-label="Designer navigation">
          {nav.map(({ id, label, icon: Icon, count }) => (
            <button
              type="button"
              className={section === id ? "active" : ""}
              onClick={() => navigate(id)}
              aria-current={section === id ? "page" : undefined}
              key={id}
            >
              <Icon size={18} />
              <span>{label}</span>
              {count ? <b>{count}</b> : null}
            </button>
          ))}
        </nav>
        <div className="designer-sidebar-foot">
          <ShieldCheck size={15} />
          <span>
            <b>Local library</b>
            <small>IndexedDB · offline ready</small>
          </span>
        </div>
      </aside>
      <div className="designer-main">
        <header className="designer-topbar">
          <form onSubmit={submitSearch}>
            <Search size={18} />
            <input
              aria-label="Search agents"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, Agent ID or REN"
            />
            <kbd>↵</kbd>
          </form>
          <span>
            <i />
            Designer workstation
          </span>
        </header>
        <div className="designer-content">
          {error ? (
            <div className="designer-error" role="alert">
              <AlertTriangle size={20} />
              <span>
                <b>Library unavailable</b>
                {error}
              </span>
              <button type="button" onClick={() => void refresh()}>
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          ) : null}
          {loading ? (
            <div className="designer-loading">
              <LoaderCircle className="spin" size={27} />
              <b>Opening local library…</b>
            </div>
          ) : null}
          {!loading && section === "overview" ? (
            <Overview
              snapshot={snapshot}
              counts={counts}
              onSection={navigate}
              onRefresh={refresh}
            />
          ) : null}
          {!loading && section === "queue" ? (
            <Queue
              key={selectedSubmission?.submissionId ?? "empty"}
              submissions={pending}
              selected={selectedSubmission}
              enhancement={selectedEnhancement}
              onSelect={setSelectedSubmissionId}
              onRefresh={refresh}
            />
          ) : null}
          {!loading && section === "assets" ? (
            <Assets
              snapshot={snapshot}
              selectedTeam={selectedTeam}
              onTeam={setSelectedTeam}
              selectedAgentId={selectedAgentId}
              onAgent={setSelectedAgentId}
            />
          ) : null}
          {!loading && section === "directory" ? (
            <BulkDirectory
              key={query}
              agents={mergeAgents(localResults, directory)}
              state={directoryState}
              progress={progress}
              query={query}
              selectedAgentId={selectedAgentId}
              onAgent={setSelectedAgentId}
              snapshot={snapshot}
              onRefresh={() => refresh(true)}
            />
          ) : null}
          {!loading && section === "history" ? (
            <HistoryFeed
              snapshot={snapshot}
              hasRecords={hasRecords}
              onRefresh={refresh}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}

function PageTitle({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="designer-page-title">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {action}
    </header>
  );
}
function Overview({
  snapshot,
  counts,
  onSection,
  onRefresh,
}: {
  snapshot: DesignerSnapshot;
  counts: ReturnType<typeof overviewCounts>;
  onSection: (section: Section) => void;
  onRefresh: () => Promise<void>;
}) {
  const load = async () => {
      await designerStore().loadDemoData();
      await onRefresh();
    },
    images = libraryImages(snapshot);
  return (
    <section>
      <PageTitle
        eyebrow="WORKLOAD"
        title="Portrait desk"
        copy="Review waiting photos, release approved ones, and keep a record."
        action={
          snapshot.submissions.length ? (
            <span className="designer-local">
              <ShieldCheck size={16} />
              Library ready
            </span>
          ) : (
            <button
              className="designer-demo"
              type="button"
              onClick={() => void load()}
            >
              <Sparkles size={16} />
              Load demo data
            </button>
          )
        }
      />
      {!snapshot.submissions.length ? (
        <div className="designer-first-run">
          <Inbox size={32} />
          <h2>No designer records yet</h2>
          <p>
            Review requests and approved kiosk photos will appear automatically.
            Load offline demo data to explore every dashboard view now.
          </p>
          <button type="button" onClick={() => void load()}>
            <Sparkles size={17} />
            Load demo data
          </button>
        </div>
      ) : (
        <>
          <div className="designer-counts">
            <article
              className={`attention ${counts.pending ? "action" : "zero"}`}
            >
              <span>Needs a human</span>
              <strong>{counts.pending}</strong>
              <p>
                Original approvals and AI-enhanced checks waiting for a
                decision.
              </p>
              <button type="button" onClick={() => onSection("queue")}>
                Open queue <ChevronRight size={16} />
              </button>
            </article>
            <article className={images.length ? "approved" : "zero"}>
              <span>Agent images</span>
              <strong>{images.length}</strong>
              <p>
                Every pending and approved image stored on this designer
                workstation.
              </p>
              <button type="button" onClick={() => onSection("assets")}>
                Browse library <ChevronRight size={16} />
              </button>
            </article>
            <article className={snapshot.reviews.length ? "pending" : "zero"}>
              <span>Decisions recorded</span>
              <strong>{snapshot.reviews.length}</strong>
              <p>Final decisions and notes remain attached to each case.</p>
              <button type="button" onClick={() => onSection("history")}>
                View history <ChevronRight size={16} />
              </button>
            </article>
          </div>
          <div className="designer-overview-grid">
            <section>
              <div className="designer-section-head">
                <div>
                  <span>Current workload</span>
                  <b>{counts.pending} pending</b>
                </div>
                <button type="button" onClick={() => onSection("queue")}>
                  View all
                </button>
              </div>
              {snapshot.submissions.slice(0, 5).map((item) => (
                <button
                  type="button"
                  className="designer-work-row"
                  onClick={() =>
                    onSection(
                      pendingStatuses.has(item.status) ? "queue" : "assets",
                    )
                  }
                  key={item.submissionId}
                >
                  <span className={`designer-status-dot ${item.status}`} />
                  <span>
                    <b>{item.agentName}</b>
                    <small>
                      {item.reviewType} · {item.marketingReadiness}/100
                    </small>
                  </span>
                  <em>{statusLabel(item.status)}</em>
                  <ChevronRight size={15} />
                </button>
              ))}
            </section>
            <section>
              <div className="designer-section-head">
                <div>
                  <span>Recent activity</span>
                  <b>Decision trail</b>
                </div>
              </div>
              {snapshot.events.slice(0, 5).map((event) => (
                <div className="designer-event" key={event.eventId}>
                  <span>
                    <History size={14} />
                  </span>
                  <div>
                    <b>{event.action}</b>
                    <small>
                      {agentName(snapshot, event.agentId)} ·{" "}
                      {dateTime(event.at)}
                    </small>
                  </div>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </section>
  );
}

function Queue({
  submissions,
  selected,
  enhancement,
  onSelect,
  onRefresh,
}: {
  submissions: DesignerSubmission[];
  selected?: DesignerSubmission;
  enhancement?: DesignerEnhancement;
  onSelect: (id: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [action, setAction] = useState<DesignerAction | null>(null),
    [reason, setReason] = useState("Framing or crop needs another capture"),
    [note, setNote] = useState(""),
    [saving, setSaving] = useState(false),
    [compare, setCompare] = useState(false);
  // The designer judges the photo the agent chose to submit — the enhanced portrait for an enhanced
  // review, the original otherwise. Showing both side by side made it ambiguous which one a decision
  // applied to, so the original is now an explicit identity reference behind one toggle.
  const sentEnhanced = Boolean(enhancement),
    sentImageId = enhancement ? enhancement.imageId : (selected?.imageId ?? ""),
    sentScore = enhancement
      ? enhancement.enhancedMarketingReadiness
      : (selected?.marketingReadiness ?? 0);
  const decide = async () => {
    if (!selected || !action) return;
    setSaving(true);
    try {
      const detail = [reason, note.trim()].filter(Boolean).join(" · ");
      await designerStore().applyDecision({
        submissionId: selected.submissionId,
        action,
        notes: detail,
      });
      await onRefresh();
      setAction(null);
    } finally {
      setSaving(false);
    }
  };
  return (
    <section>
      <PageTitle
        eyebrow="REVIEW QUEUE"
        title="Review queue"
        copy="You see the photo the agent submitted. Pick one decision — it is final and it is recorded."
      />
      {!submissions.length ? (
        <div className="designer-first-run compact">
          <CheckCircle2 size={30} />
          <h2>Queue cleared</h2>
          <p>There are no portraits waiting for a designer decision.</p>
        </div>
      ) : (
        <div className="designer-review-layout">
          <aside className="designer-review-list">
            <div>
              <span>Waiting</span>
              <b>
                {submissions.length} case{submissions.length === 1 ? "" : "s"}
              </b>
            </div>
            {submissions.map((item) => (
              <button
                type="button"
                className={
                  selected?.submissionId === item.submissionId ? "active" : ""
                }
                onClick={() => onSelect(item.submissionId)}
                key={item.submissionId}
              >
                <span className="designer-avatar">
                  <UserRound size={18} />
                </span>
                <span>
                  <b>{item.agentName}</b>
                  <small>{item.reviewType}</small>
                  <em>{dateTime(item.createdAt)}</em>
                </span>
                <i>{item.marketingReadiness}</i>
                <ChevronRight size={15} />
              </button>
            ))}
          </aside>
          {selected ? (
            <article className="designer-case">
              <header>
                <div>
                  <span
                    className={`designer-case-kind ${selected.requestKind}`}
                  >
                    {selected.requestKind === "enhanced_review"
                      ? "AI ENHANCED"
                      : "ORIGINAL APPROVAL"}
                  </span>
                  <h2>{selected.agentName}</h2>
                  <p>
                    {selected.agentId} · {selected.submissionId}
                  </p>
                </div>
                <span className="designer-case-status">
                  <Clock3 size={14} />
                  {statusLabel(selected.status)}
                </span>
              </header>
              <div className="designer-case-photo">
                <div className="designer-photo-head">
                  <div>
                    <span>Photo the agent sent</span>
                    <b>
                      {sentEnhanced ? "AI-enhanced portrait" : "Original photo"}
                    </b>
                  </div>
                  {sentEnhanced ? (
                    <button
                      type="button"
                      className="designer-compare-toggle"
                      aria-pressed={compare}
                      onClick={() => setCompare((value) => !value)}
                    >
                      {compare
                        ? "Hide the original"
                        : "Compare with the original"}
                    </button>
                  ) : null}
                </div>
                <div
                  className={`designer-comparison ${sentEnhanced && compare ? "paired" : ""}`}
                >
                  <figure className={sentEnhanced ? "enhanced" : ""}>
                    <StoredImage
                      imageId={sentImageId}
                      alt={`${selected.agentName} ${sentEnhanced ? "AI-enhanced" : "original"} portrait, submitted for review`}
                    />
                    <figcaption>
                      <span>
                        {sentEnhanced
                          ? "AI enhanced · submitted"
                          : "Original · submitted"}
                      </span>
                      <b>{sentScore}/100</b>
                    </figcaption>
                  </figure>
                  {sentEnhanced && compare ? (
                    <figure>
                      <StoredImage
                        imageId={selected.imageId}
                        alt={`${selected.agentName} original portrait, identity reference`}
                      />
                      <figcaption>
                        <span>Original · reference only</span>
                        <b>{selected.marketingReadiness}/100</b>
                      </figcaption>
                    </figure>
                  ) : null}
                </div>
              </div>
              <div className="designer-case-body">
                <div className="designer-assessment">
                  <div className="designer-score-pair">
                    <span>
                      <small>Marketing readiness</small>
                      <strong>
                        {selected.marketingReadiness}
                        <i>/100</i>
                      </strong>
                    </span>
                    <span>
                      <small>AI usability</small>
                      <strong>
                        {selected.aiUsability}
                        <i>/100</i>
                      </strong>
                    </span>
                  </div>
                  <div className="designer-category-grid">
                    {Object.entries(selected.categories).map(
                      ([name, score]) => (
                        <span key={name}>
                          <small>{categoryLabel(name)}</small>
                          <b>{score}</b>
                          <i>
                            <b style={{ width: `${score}%` }} />
                          </i>
                        </span>
                      ),
                    )}
                  </div>
                  {selected.issues.length ? (
                    <section>
                      <span>AI issues</span>
                      <ul>
                        {selected.issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {enhancement ? (
                    <section>
                      <span>Enhanced portrait checks</span>
                      <ul className="designer-checks">
                        {enhancement.checks.map((check) => (
                          <li
                            className={check.status.toLowerCase()}
                            key={`${check.label}-${check.detail}`}
                          >
                            <i>
                              {check.status === "PASS" ? (
                                <Check size={12} />
                              ) : (
                                <AlertTriangle size={12} />
                              )}
                            </i>
                            <span>
                              <b>{check.label}</b>
                              <small>{check.detail}</small>
                            </span>
                            <em>{check.status}</em>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
                <aside className="designer-request">
                  <section>
                    <span>Review focus</span>
                    {selected.disputedGates.length ? (
                      <ul>
                        {selected.disputedGates.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        Judge whether the portrait is ready for the requested
                        marketing use.
                      </p>
                    )}
                  </section>
                  <section>
                    <span>Agent note</span>
                    <p>{selected.note || "No note was added."}</p>
                  </section>
                </aside>
              </div>
              <footer className="designer-action-rail">
                {action ? (
                  <div className="designer-decision-form">
                    <div>
                      <small>Confirm final decision</small>
                      <b>{actionLabel(action, enhancement)}</b>
                      <p>
                        This is final. Approve, retake and re-upload cannot be
                        changed afterwards.
                      </p>
                    </div>
                    {action === "retake" ||
                    action === "reupload" ||
                    action === "reject_enhancement" ? (
                      <label>
                        <span>Reason</span>
                        <select
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                        >
                          <option>Framing or crop needs another capture</option>
                          <option>
                            Photo detail is not sufficient for the requested use
                          </option>
                          <option>A larger original file is required</option>
                          <option>
                            AI-enhanced result does not preserve the source
                            faithfully
                          </option>
                        </select>
                      </label>
                    ) : null}
                    <label>
                      <span>
                        Designer note{" "}
                        {action === "retake" ||
                        action === "reupload" ||
                        action === "reject_enhancement"
                          ? "(optional)"
                          : ""}
                      </span>
                      <textarea
                        rows={2}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Add a concise decision note"
                      />
                    </label>
                    <div>
                      <button type="button" onClick={() => setAction(null)}>
                        <X size={17} />
                        <span>
                          <b>Go back</b>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="confirm"
                        onClick={() => void decide()}
                        disabled={saving}
                      >
                        {saving ? (
                          <LoaderCircle className="spin" size={17} />
                        ) : (
                          <CheckCircle2 size={17} />
                        )}
                        <span>
                          <b>{saving ? "Saving…" : "Confirm decision"}</b>
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="designer-actions">
                    {sentEnhanced ? (
                      <>
                        <button
                          type="button"
                          className="approve"
                          onClick={() => setAction("approve_enhanced")}
                        >
                          <CheckCircle2 size={18} />
                          <span>
                            <b>Approve this photo</b>
                            <small>Releases the AI-enhanced portrait</small>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAction("reject_enhancement")}
                        >
                          <X size={18} />
                          <span>
                            <b>Reject &amp; ask for a new photo</b>
                            <small>The AI version is not usable</small>
                          </span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="approve"
                          onClick={() => setAction("approve_original")}
                        >
                          <CheckCircle2 size={18} />
                          <span>
                            <b>Approve this photo</b>
                            <small>Releases the original photo</small>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAction("retake")}
                        >
                          <RotateCcw size={18} />
                          <span>
                            <b>Ask for a new photo</b>
                            <small>Framing or quality needs a retake</small>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAction("reupload")}
                        >
                          <Upload size={18} />
                          <span>
                            <b>Ask for a better file</b>
                            <small>Same photo, higher resolution</small>
                          </span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setAction("keep_review")}
                    >
                      <Archive size={18} />
                      <span>
                        <b>Decide later</b>
                        <small>Keeps the case in this queue</small>
                      </span>
                    </button>
                  </div>
                )}
              </footer>
            </article>
          ) : null}
        </div>
      )}
    </section>
  );
}

function Assets({
  snapshot,
  selectedTeam,
  onTeam,
  selectedAgentId,
  onAgent,
}: {
  snapshot: DesignerSnapshot;
  selectedTeam: string;
  onTeam: (team: string) => void;
  selectedAgentId: string;
  onAgent: (id: string) => void;
}) {
  const [groupMode, setGroupMode] = useState<"team" | "individual">("team"),
    [scope, setScope] = useState<"all" | "pending" | "approved">("all"),
    allImages = libraryImages(snapshot),
    images = allImages.filter(
      (item) => scope === "all" || item.status === scope,
    ),
    groups = imageGroups(snapshot, images),
    individuals = groups
      .flatMap((group) => group.agents)
      .sort((a, b) => a.agent.name.localeCompare(b.agent.name)),
    team = groups.find((item) => item.team === selectedTeam) ?? groups[0],
    selected =
      snapshot.agents.find((item) => item.agentId === selectedAgentId) ??
      individuals.find((item) => item.agent.agentId === selectedAgentId)?.agent;
  if (selectedAgentId && selected)
    return (
      <AgentProfile
        agent={selected}
        snapshot={snapshot}
        onBack={() => onAgent("")}
      />
    );
  const setMode = (mode: "team" | "individual") => {
    setGroupMode(mode);
    onTeam("");
  };
  return (
    <section>
      <PageTitle
        eyebrow="PHOTO LIBRARY"
        title="Photos and approved assets"
        copy="See every stored agent image, including portraits waiting for review and work already approved."
      />
      <div className="designer-library-controls">
        <div role="group" aria-label="Image status">
          <button
            type="button"
            className={scope === "all" ? "active" : ""}
            onClick={() => setScope("all")}
          >
            All images <b>{allImages.length}</b>
          </button>
          <button
            type="button"
            className={scope === "pending" ? "active pending" : ""}
            onClick={() => setScope("pending")}
          >
            Pending{" "}
            <b>
              {allImages.filter((item) => item.status === "pending").length}
            </b>
          </button>
          <button
            type="button"
            className={scope === "approved" ? "active approved" : ""}
            onClick={() => setScope("approved")}
          >
            Approved{" "}
            <b>
              {allImages.filter((item) => item.status === "approved").length}
            </b>
          </button>
        </div>
        <div role="group" aria-label="Group images by">
          <span>Group by</span>
          <button
            type="button"
            className={groupMode === "team" ? "active" : ""}
            onClick={() => setMode("team")}
          >
            <Users size={14} />
            Team
          </button>
          <button
            type="button"
            className={groupMode === "individual" ? "active" : ""}
            onClick={() => setMode("individual")}
          >
            <UserRound size={14} />
            Individual
          </button>
        </div>
      </div>
      {!images.length ? (
        <div className="designer-first-run compact">
          <FolderOpen size={30} />
          <h2>No {scope === "all" ? "stored images" : `${scope} images`}</h2>
          <p>Agent uploads and review submissions appear here automatically.</p>
        </div>
      ) : groupMode === "team" && !selectedTeam ? (
        <div className="designer-team-grid">
          {groups.map((group) => (
            <button
              type="button"
              onClick={() => onTeam(group.team)}
              key={group.team}
            >
              <span>
                <Users size={19} />
              </span>
              <div>
                <b>{group.team}</b>
                <small>
                  {group.agents.length} agent
                  {group.agents.length === 1 ? "" : "s"} · {group.imageCount}{" "}
                  image{group.imageCount === 1 ? "" : "s"}
                </small>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="designer-asset-heading">
            {groupMode === "team" ? (
              <div>
                <button
                  type="button"
                  className="designer-back"
                  onClick={() => onTeam("")}
                >
                  <ArrowLeft size={16} />
                  All teams
                </button>
                <span>TEAM</span>
                <h2>{team?.team}</h2>
              </div>
            ) : (
              <div>
                <span>INDIVIDUAL AGENTS</span>
                <h2>All agents with images</h2>
              </div>
            )}
            <b>
              {images.length} image{images.length === 1 ? "" : "s"}
            </b>
          </div>
          <div className={`designer-agent-library ${groupMode}`}>
            {(groupMode === "team" ? (team?.agents ?? []) : individuals).map(
              (item) => (
                <article key={item.agent.agentId}>
                  <button
                    type="button"
                    className="designer-agent-title"
                    onClick={() => onAgent(item.agent.agentId)}
                  >
                    <AgentAvatar
                      agent={item.agent}
                      imageId={item.images[0]?.imageId ?? ""}
                    />
                    <span>
                      <b>{item.agent.name}</b>
                      <small>
                        {item.agent.agentId}
                        {item.agent.ren ? ` · ${item.agent.ren}` : ""} ·{" "}
                        {item.images.length} image
                        {item.images.length === 1 ? "" : "s"}
                      </small>
                    </span>
                    <AgentStateBadge
                      summary={agentPhotoSummary(
                        item.agent.agentId,
                        snapshot.submissions,
                        snapshot.assets,
                      )}
                    />
                    <ChevronRight size={16} />
                  </button>
                  <div className="designer-asset-grid">
                    {item.images.map((image) => (
                      <ImageCard
                        image={image}
                        agent={item.agent}
                        key={image.key}
                      />
                    ))}
                  </div>
                </article>
              ),
            )}
          </div>
        </>
      )}
    </section>
  );
}
function ImageCard({
  image,
  agent,
}: {
  image: LibraryImage;
  agent: DesignerAgent;
}) {
  const download = async (transparent = false) => {
    const imageId =
        transparent && image.asset?.transparentImageId
          ? image.asset.transparentImageId
          : image.imageId,
      blob = await designerStore().image(imageId);
    if (!blob) return;
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = sanitiseApprovedFilename(
      agent.name,
      agent.agentId,
      blob.type.includes("jpeg") ? "jpg" : "png",
    );
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <article className={`designer-asset-card ${image.status}`}>
      <div>
        <StoredImage
          imageId={image.asset?.transparentImageId ?? image.imageId}
          alt={`${agent.name} ${sourceLabel[image.sourceType]} portrait`}
        />
        <span>{sourceLabel[image.sourceType]}</span>
        <em className={`designer-image-state ${image.status}`}>
          {libraryStatusLabel(image.status)}
        </em>
      </div>
      <section>
        <b>
          {sourceLabel[image.sourceType]}
          {photoCategoryBadge(image.category) ? (
            <i className={`designer-photo-category ${image.category}`}>
              {photoCategoryBadge(image.category)}
            </i>
          ) : null}
        </b>
        <small>
          {image.score ? `${image.score}/100 · ` : ""}
          {dateTime(image.at)}
        </small>
        <em>
          {image.asset?.approvedBy ??
            (image.status === "pending"
              ? "Waiting for designer decision"
              : "Stored agent image")}
        </em>
        <div>
          <button type="button" onClick={() => void download(false)}>
            <Download size={14} />
            Download
          </button>
          {image.asset?.transparentImageId ? (
            <button type="button" onClick={() => void download(true)}>
              <Download size={14} />
              Transparent PNG
            </button>
          ) : null}
        </div>
      </section>
    </article>
  );
}

function Directory({
  agents,
  state,
  progress,
  query,
  selectedAgentId,
  onAgent,
  snapshot,
}: {
  agents: DesignerAgent[];
  state: "idle" | "loading" | "indexing" | "error";
  progress: number;
  query: string;
  selectedAgentId: string;
  onAgent: (id: string) => void;
  snapshot: DesignerSnapshot;
}) {
  const [photoFilter, setPhotoFilter] = useState<"all" | AgentPhotoState>(
      "all",
    ),
    [sort, setSort] = useState<"name" | "status" | "images">("status"),
    selected =
      agents.find((item) => item.agentId === selectedAgentId) ??
      snapshot.agents.find((item) => item.agentId === selectedAgentId);
  if (selected)
    return (
      <AgentProfile
        agent={selected}
        snapshot={snapshot}
        onBack={() => onAgent("")}
      />
    );
  const filtered = agents.filter(
      (agent) =>
        photoFilter === "all" ||
        agentPhotoSummary(agent.agentId, snapshot.submissions, snapshot.assets)
          .state === photoFilter,
    ),
    ordered =
      sort === "status"
        ? sortAgentsByPhotoState(
            filtered,
            snapshot.submissions,
            snapshot.assets,
          )
        : [...filtered].sort((a, b) =>
            sort === "images"
              ? agentPhotoSummary(
                  b.agentId,
                  snapshot.submissions,
                  snapshot.assets,
                ).images -
                  agentPhotoSummary(
                    a.agentId,
                    snapshot.submissions,
                    snapshot.assets,
                  ).images || a.name.localeCompare(b.name)
              : a.name.localeCompare(b.name),
          ),
    latest = latestImageByAgent(libraryImages(snapshot));
  return (
    <section>
      <PageTitle
        eyebrow="AGENT DIRECTORY"
        title="Find an agent"
        copy="See who has photos, what is waiting for approval, and who still needs an image."
      />
      {state === "indexing" ? (
        <div className="designer-indexing">
          <LoaderCircle className="spin" size={20} />
          <span>
            <b>Indexing the IQI agent directory…</b>
            <small>
              {progress}% complete · local Agent ID and photo records still work
            </small>
          </span>
          <i>
            <b style={{ width: `${progress}%` }} />
          </i>
        </div>
      ) : null}
      {state === "error" ? (
        <div className="designer-directory-note">
          <AlertTriangle size={18} />
          <span>
            <b>Live directory unavailable</b>
            <small>
              Showing agents already known to this browser. Try again when the
              connection returns.
            </small>
          </span>
        </div>
      ) : null}
      <div className="designer-directory-controls">
        <label>
          <span>Photo status</span>
          <select
            value={photoFilter}
            onChange={(event) =>
              setPhotoFilter(event.target.value as "all" | AgentPhotoState)
            }
          >
            <option value="all">All agents</option>
            <option value="pending">Pending approval</option>
            <option value="approved">Approved</option>
            <option value="has_images">Has images</option>
            <option value="none">No images</option>
          </select>
        </label>
        <label>
          <span>Sort by</span>
          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as "name" | "status" | "images")
            }
          >
            <option value="status">Photo status</option>
            <option value="images">Most images</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </div>
      <div className="designer-directory-meta">
        <span>{query ? `Results for “${query}”` : "Browse agents"}</span>
        <b>{ordered.length} shown</b>
      </div>
      {state === "loading" ? (
        <div className="designer-loading compact">
          <LoaderCircle className="spin" size={22} />
          <b>Searching agents…</b>
        </div>
      ) : ordered.length ? (
        <div className="designer-directory-grid">
          {ordered.map((agent) => {
            const summary = agentPhotoSummary(
              agent.agentId,
              snapshot.submissions,
              snapshot.assets,
            );
            return (
              <button
                type="button"
                onClick={() => onAgent(agent.agentId)}
                key={agent.agentId}
              >
                <AgentAvatar
                  agent={agent}
                  imageId={agentPreviewId(agent, latest, snapshot.assets)}
                />
                <span>
                  <b>{agent.name}</b>
                  <small>
                    {agent.agentId}
                    {agent.ren ? ` · ${agent.ren}` : ""}
                  </small>
                  <em>
                    {agent.teamName}
                    {agent.branch ? ` · ${agent.branch}` : ""}
                  </em>
                </span>
                <AgentStateBadge summary={summary} />
                <ChevronRight size={17} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="designer-first-run compact">
          <Search size={29} />
          <h2>{query ? "No matching agents" : "No agents in this status"}</h2>
          <p>
            {query
              ? "Try a full Agent ID, REN number or another spelling."
              : "Choose another photo status above."}
          </p>
        </div>
      )}
    </section>
  );
}
export { Directory };

/* Triage order, matching sortAgentsByPhotoState: what a designer has to act on first comes
   first, so the filter row reads in the same order as the grid it filters. */
const photoStateFilters: { value: AgentPhotoState; label: string }[] = [
  { value: "pending", label: "Pending approval" },
  { value: "retake", label: "Retake required" },
  { value: "reupload", label: "Re-upload required" },
  { value: "approved", label: "Approved" },
  { value: "none", label: "Photo required" },
  { value: "has_images", label: "Has images" },
  { value: "opted_out", label: "Opted out" },
];

function BulkDirectory({
  agents,
  state,
  progress,
  query,
  selectedAgentId,
  onAgent,
  snapshot,
  onRefresh,
}: {
  agents: DesignerAgent[];
  state: "idle" | "loading" | "indexing" | "error";
  progress: number;
  query: string;
  selectedAgentId: string;
  onAgent: (id: string) => void;
  snapshot: DesignerSnapshot;
  onRefresh: () => Promise<void>;
}) {
  const [photoFilter, setPhotoFilter] = useState<"all" | AgentPhotoState>(
      "all",
    ),
    [teamFilter, setTeamFilter] = useState("all"),
    [sort, setSort] = useState<"name" | "status" | "images">("status"),
    [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()),
    [downloadOpen, setDownloadOpen] = useState(false),
    [reminderOpen, setReminderOpen] = useState(false),
    [sending, setSending] = useState(false),
    [sent, setSent] = useState<PhotoReminder[]>([]),
    [testRecipient, setTestRecipient] = useState(""),
    [emailTestMode, setEmailTestMode] = useState(false),
    [smtpEnabled, setSmtpEnabled] = useState(false),
    [now] = useState(() => Date.now()),
    selected =
      agents.find((item) => item.agentId === selectedAgentId) ??
      snapshot.agents.find((item) => item.agentId === selectedAgentId);
  useEffect(() => {
    let active = true;
    fetch("/api/designer-test-email", { cache: "no-store" })
      .then((response) => response.json())
      .then(
        (result: {
          configured?: boolean;
          recipient?: string | null;
          smtpEnabled?: boolean;
          testMode?: boolean;
        }) => {
          if (!active) return;
          setTestRecipient(
            result.configured && result.recipient ? result.recipient : "",
          );
          setEmailTestMode(Boolean(result.testMode));
          setSmtpEnabled(Boolean(result.smtpEnabled));
        },
      )
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (selected)
    return (
      <AgentProfile
        agent={selected}
        snapshot={snapshot}
        onBack={() => onAgent("")}
      />
    );
  const summaryOf = (agent: DesignerAgent) =>
      agentPhotoSummary(
        agent.agentId,
        snapshot.submissions,
        snapshot.assets,
        agent,
      ),
    teams = [
      ...new Set(agents.map((agent) => agent.teamName).filter(Boolean)),
    ].sort(),
    teamAgents = agents.filter(
      (agent) => teamFilter === "all" || agent.teamName === teamFilter,
    ),
    /* Counts follow the team filter but not the status filter: the row has to keep saying how
       much work sits behind every other status while one of them is open. */
    stateCounts = teamAgents.reduce(
      (counts, agent) => {
        const state = summaryOf(agent).state;
        counts[state] = (counts[state] ?? 0) + 1;
        return counts;
      },
      {} as Partial<Record<AgentPhotoState, number>>,
    ),
    filtered = teamAgents.filter(
      (agent) => photoFilter === "all" || summaryOf(agent).state === photoFilter,
    ),
    ordered =
      sort === "status"
        ? sortAgentsByPhotoState(
            filtered,
            snapshot.submissions,
            snapshot.assets,
          )
        : [...filtered].sort((a, b) =>
            sort === "images"
              ? summaryOf(b).images - summaryOf(a).images ||
                a.name.localeCompare(b.name)
              : a.name.localeCompare(b.name),
          ),
    selectedAgents = agents.filter((agent) => selectedIds.has(agent.agentId)),
    downloadable = selectedAgents
      .map((agent) => currentDownloadableAsset(agent, snapshot.assets))
      .filter((item) => item !== null),
    reminderEligible =
      emailTestMode && !testRecipient
        ? []
        : selectedAgents.filter((agent) =>
            isPhotoReminderEligible(
              agent,
              summaryOf(agent),
              emailTestMode ? testRecipient : "",
            ),
          ),
    optedOutCount = selectedAgents.filter(
      (agent) => summaryOf(agent).state === "opted_out",
    ).length,
    allVisibleSelected =
      Boolean(ordered.length) &&
      ordered.every((agent) => selectedIds.has(agent.agentId)),
    lastReminder = (agentId: string) =>
      snapshot.reminders.find((item) => item.agentId === agentId),
    recentReminderCount = reminderEligible.filter((agent) => {
      const last = lastReminder(agent.agentId);
      return (
        last && now - new Date(last.sentAt).getTime() < 24 * 60 * 60 * 1000
      );
    }).length,
    latest = latestImageByAgent(libraryImages(snapshot));
  const toggle = (id: string) =>
      setSelectedIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    selectAll = () =>
      setSelectedIds((current) => {
        const next = new Set(current);
        if (allVisibleSelected)
          ordered.forEach((agent) => next.delete(agent.agentId));
        else ordered.forEach((agent) => next.add(agent.agentId));
        return next;
      }),
    clear = () => setSelectedIds(new Set());
  const bulkDownloadSelectedAssets = async () => {
    const files = [] as { name: string; data: Uint8Array }[];
    for (const item of downloadable) {
      const blob = await designerStore().image(item.imageId);
      if (!blob) continue;
      const extension = blob.type.includes("jpeg") ? "jpg" : "png",
        name = sanitiseApprovedFilename(
          item.agent.name,
          item.agent.agentId,
          extension,
          item.asset.sourceType,
        );
      files.push({ name, data: new Uint8Array(await blob.arrayBuffer()) });
    }
    if (!files.length) return;
    if (files.length === 1) {
      const blob = new Blob([files[0].data]),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = files[0].name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      const zip = createPhotoZip(files),
        url = URL.createObjectURL(zip),
        link = document.createElement("a");
      link.href = url;
      link.download = `ProfileLabAI_Approved_Photos_${files.length}.zip`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    setDownloadOpen(false);
  };
  const preparePhotoReminderRecipients = () => {
      setSent([]);
      setReminderOpen(true);
    },
    sendReminders = async () => {
      if (emailTestMode && !testRecipient) return;
      setSending(true);
      try {
        const records = await designerStore().sendPhotoReminders(
          reminderEligible.map((agent) => {
            const actualRecipientEmail = emailTestMode
              ? testRecipient
              : photoReminderRecipient(agent);
            return {
              agentId: agent.agentId,
              agentName: agent.name,
              gender: agent.gender ?? agentPresentation(agent.name),
              recipientEmail: actualRecipientEmail,
              intendedRecipientEmail: agent.email,
              actualRecipientEmail,
              relatedPhotoStatus: summaryOf(agent).state,
              subject: emailTestMode
                ? `[TEST] Reminder: Upload Your Profile Lab AI Profile Photo — ${agent.name}`
                : "Reminder: Upload Your Profile Lab AI Profile Photo",
              testMode: emailTestMode,
              sentBy: "Profile Lab AI designer",
              demo: agent.demo,
            };
          }),
        );
        if (!smtpEnabled) setSent(records);
        else {
          let delivered = new Set<string>();
          try {
            const response = await fetch("/api/designer-test-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reminders: records }),
              }),
              result = (await response.json()) as { deliveredIds?: string[] };
            if (response.ok) delivered = new Set(result.deliveredIds ?? []);
          } catch (error) {
            console.error("SMTP test delivery request failed", error);
          }
          const finalised = await designerStore().finalisePhotoReminders(
            records.map((reminder) => ({
              reminderId: reminder.reminderId,
              deliveryStatus: delivered.has(reminder.reminderId)
                ? "SMTP_DELIVERED"
                : "FAILED",
            })),
          );
          setSent(finalised);
        }
        await onRefresh();
      } finally {
        setSending(false);
      }
    };
  const excluded = [
    {
      label: "already approved",
      count: selectedAgents.filter(
        (agent) => summaryOf(agent).state === "approved",
      ).length,
    },
    {
      label: "pending approval or already submitted",
      count: selectedAgents.filter((agent) =>
        ["pending", "has_images"].includes(summaryOf(agent).state),
      ).length,
    },
    { label: "opted out", count: optedOutCount },
  ].filter((item) => item.count);
  return (
    <section>
      <PageTitle
        eyebrow="AGENT DIRECTORY"
        title="Find an agent"
        copy="See who has photos, select matching records, download approved assets, or prepare a safe photo reminder."
      />
      {state === "indexing" ? (
        <div className="designer-indexing">
          <LoaderCircle className="spin" size={20} />
          <span>
            <b>Indexing the IQI agent directory…</b>
            <small>
              {progress}% complete · local Agent ID and photo records still work
            </small>
          </span>
          <i>
            <b style={{ width: `${progress}%` }} />
          </i>
        </div>
      ) : null}
      {state === "error" ? (
        <div className="designer-directory-note">
          <AlertTriangle size={18} />
          <span>
            <b>Live directory unavailable</b>
            <small>
              Showing agents already known to this browser. Try again when the
              connection returns.
            </small>
          </span>
        </div>
      ) : null}
      <div className="designer-directory-toolbar">
        <div
          className="directory-status-filter"
          role="group"
          aria-label="Filter by photo status"
        >
          <button
            type="button"
            className={photoFilter === "all" ? "active" : ""}
            aria-pressed={photoFilter === "all"}
            onClick={() => setPhotoFilter("all")}
          >
            All agents<b>{teamAgents.length}</b>
          </button>
          {/* An empty status is dropped rather than shown at zero — except the open one, which
              has to stay on screen to remain unselectable-from. */}
          {photoStateFilters
            .filter(
              (item) => stateCounts[item.value] || photoFilter === item.value,
            )
            .map((item) => (
              <button
                type="button"
                key={item.value}
                className={`${item.value}${photoFilter === item.value ? " active" : ""}`}
                aria-pressed={photoFilter === item.value}
                onClick={() => setPhotoFilter(item.value)}
              >
                <i />
                {item.label}
                <b>{stateCounts[item.value] ?? 0}</b>
              </button>
            ))}
        </div>
        <div className="directory-sorts">
          <label>
            <span>Team</span>
            <select
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
            >
              <option value="all">All teams</option>
              {teams.map((team) => (
                <option value={team} key={team}>
                  {team}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Sort by</span>
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as "name" | "status" | "images")
              }
            >
              <option value="status">Photo status</option>
              <option value="images">Most images</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
        </div>
      </div>
      <div className="designer-directory-meta bulk">
        <label>
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={selectAll}
          />{" "}
          Select visible
        </label>
        <span>{query ? `Results for “${query}”` : "Browse agents"}</span>
        <b>{ordered.length} shown</b>
        {ordered.length && !allVisibleSelected ? (
          <button type="button" onClick={selectAll}>
            Select all {ordered.length} matching these filters
          </button>
        ) : null}
      </div>
      {selectedIds.size ? (
        <div
          className="designer-bulk-bar"
          role="region"
          aria-label="Bulk actions"
        >
          <div>
            <strong>{selectedAgents.length} selected</strong>
            <span>
              {downloadable.length} downloadable · {reminderEligible.length}{" "}
              reminder eligible
              {optedOutCount ? ` · ${optedOutCount} opted out` : ""}
            </span>
          </div>
          <button
            type="button"
            className="bulk-download"
            onClick={() => setDownloadOpen(true)}
            disabled={!downloadable.length}
          >
            <Download size={17} />
            Download Photos
          </button>
          <i />
          <button
            type="button"
            className="bulk-reminder"
            onClick={preparePhotoReminderRecipients}
            disabled={!reminderEligible.length}
          >
            <Mail size={17} />
            Send Photo Reminder
          </button>
          <button type="button" className="bulk-clear" onClick={clear}>
            Clear
          </button>
        </div>
      ) : null}
      {state === "loading" ? (
        <div className="designer-loading compact">
          <LoaderCircle className="spin" size={22} />
          <b>Searching agents…</b>
        </div>
      ) : ordered.length ? (
        <div className="designer-directory-grid bulk-grid">
          {ordered.map((agent) => {
            const summary = summaryOf(agent),
              last = lastReminder(agent.agentId);
            return (
              <article
                className={selectedIds.has(agent.agentId) ? "selected" : ""}
                data-state={summary.state}
                key={agent.agentId}
              >
                <label className="designer-select-agent">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(agent.agentId)}
                    onChange={() => toggle(agent.agentId)}
                    aria-label={`Select ${agent.name}`}
                  />
                </label>
                <button
                  type="button"
                  className="designer-agent-open"
                  onClick={() => onAgent(agent.agentId)}
                >
                  <AgentAvatar
                    agent={agent}
                    imageId={agentPreviewId(agent, latest, snapshot.assets)}
                  />
                  <span>
                    <b>{agent.name}</b>
                    <small>
                      {agent.agentId}
                      {agent.ren ? ` · ${agent.ren}` : ""}
                    </small>
                    <em>
                      {agent.teamName}
                      {agent.branch ? ` · ${agent.branch}` : ""}
                      {last ? (
                        <small>
                          Last reminder:{" "}
                          {new Intl.DateTimeFormat(undefined, {
                            dateStyle: "medium",
                          }).format(new Date(last.sentAt))}
                        </small>
                      ) : null}
                    </em>
                  </span>
                  <AgentStateBadge summary={summary} />
                  <ChevronRight size={17} />
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="designer-first-run compact">
          <Search size={29} />
          <h2>{query ? "No matching agents" : "No agents in this status"}</h2>
          <p>
            {query
              ? "Try a full Agent ID, REN number or another spelling."
              : "Choose another photo status above."}
          </p>
        </div>
      )}
      {downloadOpen ? (
        <div
          className="designer-bulk-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-download-title"
        >
          <div>
            <button
              type="button"
              className="modal-close"
              onClick={() => setDownloadOpen(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="bulk-modal-head">
              <span className="bulk-modal-icon download">
                <Download size={22} />
              </span>
              <h2 id="bulk-download-title">Download Photos</h2>
            </div>
            <p>
              <b>
                {downloadable.length} photo
                {downloadable.length === 1 ? "" : "s"} available for download
              </b>
              <br />
              {selectedAgents.length - downloadable.length} selected agent
              {selectedAgents.length - downloadable.length === 1
                ? " does"
                : "s do"}{" "}
              not currently have an approved photo.
            </p>
            <div className="bulk-modal-actions">
              <button type="button" onClick={() => setDownloadOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => void bulkDownloadSelectedAssets()}
              >
                Download {downloadable.length} Available Photo
                {downloadable.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {reminderOpen ? (
        <div
          className="designer-bulk-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reminder-title"
        >
          <div className="reminder-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() => setReminderOpen(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="bulk-modal-head">
              <span className="bulk-modal-icon reminder">
                <Mail size={22} />
              </span>
              <div>
                <span className="test-mode">
                  {smtpEnabled
                    ? "TEST MODE · SMTP DELIVERY"
                    : "TEST MODE · LOCAL MOCK MAILBOX"}
                </span>
                <h2 id="reminder-title">Send Photo Reminder</h2>
              </div>
            </div>
            {sent.length ? (
              <MockMailbox reminders={sent} excluded={excluded} />
            ) : (
              <>
                <p>
                  You are about to send a photo reminder to{" "}
                  <b>
                    {reminderEligible.length} agent
                    {reminderEligible.length === 1 ? "" : "s"}
                  </b>
                  .{" "}
                  {smtpEnabled
                    ? "Each personalised reminder will be sent through the local SMTP bridge to the configured test inbox."
                    : "No real email is sent in this development-safe build."}
                </p>
                {reminderEligible.length > 50 ? (
                  <div className="bulk-large-warning">
                    <AlertTriangle size={18} />
                    This reminder will be prepared for {
                      reminderEligible.length
                    }{" "}
                    agents.
                  </div>
                ) : null}
                {recentReminderCount ? (
                  <div className="bulk-cooldown">
                    <Clock3 size={17} />
                    {recentReminderCount} recipient
                    {recentReminderCount === 1 ? " was" : "s were"} reminded in
                    the last 24 hours. Review before continuing.
                  </div>
                ) : null}
                <div className="reminder-counts">
                  <span>
                    <b>{reminderEligible.length}</b>
                    <small>Eligible recipients</small>
                  </span>
                  <span>
                    <b>{selectedAgents.length - reminderEligible.length}</b>
                    <small>Excluded from reminder</small>
                  </span>
                </div>
                {excluded.length ? (
                  <ul className="reminder-exclusions">
                    {excluded.map((item) => (
                      <li key={item.label}>
                        <b>{item.count}</b> — {item.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <details className="recipient-review">
                  <summary>Review recipient list</summary>
                  {reminderEligible.map((agent) => (
                    <span key={agent.agentId}>
                      <b>{agent.name}</b>
                      <small>
                        {emailTestMode ? testRecipient : agent.email}
                        {lastReminder(agent.agentId)
                          ? ` · last reminded ${dateTime(lastReminder(agent.agentId)!.sentAt)}`
                          : ""}
                      </small>
                    </span>
                  ))}
                </details>
                <div className="bulk-modal-actions">
                  <button type="button" onClick={() => setReminderOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="confirm-reminder"
                    onClick={() => void sendReminders()}
                    disabled={sending}
                  >
                    {sending ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <Mail size={16} />
                    )}
                    Confirm &amp; Send {reminderEligible.length} Reminder
                    {reminderEligible.length === 1 ? "" : "s"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MockMailbox({
  reminders,
  excluded,
}: {
  reminders: PhotoReminder[];
  excluded: { label: string; count: number }[];
}) {
  const smtpDelivered = reminders.filter(
      (item) => item.deliveryStatus === "SMTP_DELIVERED",
    ).length,
    failed = reminders.filter(
      (item) => item.deliveryStatus === "FAILED",
    ).length,
    actualRecipient = reminders[0]?.actualRecipientEmail;
  return (
    <div className="mock-mailbox">
      <div>
        {failed && !smtpDelivered ? (
          <AlertTriangle size={20} />
        ) : (
          <CheckCircle2 size={20} />
        )}
        <span>
          <h3>
            {smtpDelivered
              ? "Test Reminders Sent"
              : failed
                ? "Test Reminder Delivery Failed"
                : "Mock Reminders Prepared"}
          </h3>
          <b>
            {smtpDelivered
              ? `${smtpDelivered} test email${smtpDelivered === 1 ? "" : "s"} successfully sent${failed ? ` · ${failed} failed` : ""}`
              : failed
                ? `${failed} reminder${failed === 1 ? "" : "s"} failed`
                : `${reminders.length} reminder${reminders.length === 1 ? "" : "s"} added to the mock mailbox`}
          </b>
          <small>
            {smtpDelivered
              ? `Actual delivery inbox: ${actualRecipient}`
              : failed
                ? "Check the SMTP bridge terminal and credentials, then retry."
                : "Delivery status: MOCK_DELIVERED · no network request was made"}
          </small>
        </span>
      </div>
      {excluded.length ? (
        <div className="bulk-cooldown">
          <AlertTriangle size={17} />
          {excluded.reduce((sum, item) => sum + item.count, 0)} excluded ·{" "}
          {excluded.map((item) => `${item.count} ${item.label}`).join(" · ")}
        </div>
      ) : null}
      {reminders.map((reminder) => (
        <article key={reminder.reminderId}>
          <span>
            <b>{reminder.agentName}</b>
            <small>
              {reminder.actualRecipientEmail} · {reminder.deliveryStatus}
            </small>
          </span>
        </article>
      ))}
    </div>
  );
}

function AgentProfile({
  agent,
  snapshot,
  onBack,
}: {
  agent: DesignerAgent;
  snapshot: DesignerSnapshot;
  onBack: () => void;
}) {
  const images = libraryImages(snapshot).filter(
      (item) => item.agentId === agent.agentId,
    ),
    summary = agentPhotoSummary(
      agent.agentId,
      snapshot.submissions,
      snapshot.assets,
      agent,
    ),
    events = snapshot.events.filter((item) => item.agentId === agent.agentId);
  return (
    <section>
      <button type="button" className="designer-back" onClick={onBack}>
        <ArrowLeft size={16} />
        Back
      </button>
      <header className="designer-agent-profile">
        <AgentAvatar
          agent={agent}
          imageId={
            currentDownloadableAsset(agent, snapshot.assets)?.imageId ||
            images[0]?.imageId ||
            ""
          }
          size={28}
        />
        <div>
          <span>{agent.teamName}</span>
          <h1>{agent.name}</h1>
          <p>
            {agent.agentId}
            {agent.ren ? ` · ${agent.ren}` : ""}
            {agent.designation ? ` · ${agent.designation}` : ""}
          </p>
        </div>
        <AgentStateBadge summary={summary} />
      </header>
      {agent.photoSubmissionStatus ? (
        <div className="designer-optout-note">
          <ShieldCheck size={18} />
          <span>
            <b>Photo Submission Opted Out</b>
            <small>
              Agent-confirmed{" "}
              {agent.photoOptedOutAt
                ? `· ${dateTime(agent.photoOptedOutAt)}`
                : ""}
              . Voluntary uploads remain available.
            </small>
          </span>
        </div>
      ) : null}
      {images.length ? (
        <section className="designer-profile-section">
          <h2>Photos sent to the designer</h2>
          <div className="designer-asset-grid">
            {images.map((image) => (
              <ImageCard image={image} agent={agent} key={image.key} />
            ))}
          </div>
        </section>
      ) : (
        <div className="designer-first-run compact">
          <FolderOpen size={28} />
          <h2>No images yet</h2>
          <p>
            This agent has not sent a photo to the designer on this
            workstation.
          </p>
        </div>
      )}
      {events.length ? (
        <section className="designer-profile-section">
          <h2>History</h2>
          {events.map((event) => (
            <div className="designer-profile-row" key={event.eventId}>
              <History size={16} />
              <span>
                <b>{event.action}</b>
                <small>
                  {dateTime(event.at)} · {event.actor}
                </small>
              </span>
            </div>
          ))}
        </section>
      ) : null}
    </section>
  );
}
function AgentStateBadge({
  summary,
}: {
  summary: ReturnType<typeof agentPhotoSummary>;
}) {
  return (
    <span className={`designer-agent-state ${summary.state}`}>
      <i />
      {summary.state === "pending"
        ? `${summary.pending} pending`
        : summary.state === "approved"
          ? `${summary.approved} approved`
          : summary.state === "retake"
            ? "Retake required"
            : summary.state === "reupload"
              ? "Re-upload required"
              : summary.state === "opted_out"
                ? "Opted Out"
                : summary.state === "has_images"
                  ? `${summary.images} image${summary.images === 1 ? "" : "s"}`
                  : "Photo required"}
    </span>
  );
}
function HistoryFeed({
  snapshot,
  hasRecords,
  onRefresh,
}: {
  snapshot: DesignerSnapshot;
  hasRecords: boolean;
  onRefresh: () => Promise<void>;
}) {
  // Resetting the desk lives with the history it erases, so nobody clears the library from a screen
  // that does not show what is about to go.
  const clear = async () => {
    await designerStore().clearAllData();
    await onRefresh();
  };
  return (
    <section>
      <PageTitle
        eyebrow="HISTORY"
        title="Decision history"
        copy="Every submission, approval and asset handoff stays with the case."
        action={
          hasRecords ? (
            <button
              className="designer-demo clear"
              type="button"
              onClick={() => void clear()}
            >
              <Trash2 size={16} />
              Clear all records
            </button>
          ) : null
        }
      />
      {snapshot.events.length ? (
        <div className="designer-summary" role="status">
          <div className="designer-summary-stat pending">
            <small>Recorded</small>
            <b>{snapshot.events.length}</b>
          </div>
        </div>
      ) : null}
      {snapshot.events.length ? (
        <div className="designer-history">
          {snapshot.events.map((event) => (
            <article key={event.eventId}>
              <span>
                <History size={16} />
              </span>
              <div>
                <b>{event.action}</b>
                <p>
                  {agentName(snapshot, event.agentId)} · {event.agentId}
                </p>
                <small>
                  {dateTime(event.at)}
                  {event.actor ? ` · ${event.actor}` : ""}
                </small>
              </div>
              <code>{event.refId}</code>
            </article>
          ))}
        </div>
      ) : (
        <div className="designer-first-run compact">
          <History size={29} />
          <h2>No history yet</h2>
          <p>Designer and kiosk events will appear here.</p>
        </div>
      )}
    </section>
  );
}

function libraryImages(snapshot: DesignerSnapshot) {
  const images = new Map<string, LibraryImage>(),
    assetByImage = new Map(
      snapshot.assets.map((asset) => [
        `${asset.agentId}:${asset.imageId}`,
        asset,
      ]),
    );
  for (const submission of snapshot.submissions) {
    const asset = assetByImage.get(
        `${submission.agentId}:${submission.imageId}`,
      ),
      status = asset
        ? "approved"
        : pendingStatuses.has(submission.status)
          ? "pending"
          : submission.status === DesignerCaseStatus.RETAKE_REQUIRED
            ? "retake"
            : submission.status === DesignerCaseStatus.REUPLOAD_REQUIRED
              ? "reupload"
              : "uploaded";
    // A retake or a re-upload closes the photograph and the desk deletes the file with the decision,
    // so listing it would only ever draw an empty frame. The case still shows in history and counts.
    if (status === "retake" || status === "reupload") continue;
    images.set(`${submission.agentId}:${submission.imageId}`, {
      key: `submission-${submission.submissionId}`,
      agentId: submission.agentId,
      imageId: submission.imageId,
      sourceType: asset?.sourceType ?? "original",
      status,
      category: submission.photoCategory,
      score: asset?.marketingReadiness ?? submission.marketingReadiness,
      at: asset?.approvedAt ?? submission.createdAt,
      asset,
    });
  }
  for (const enhancement of snapshot.enhancements) {
    const asset = assetByImage.get(
      `${enhancement.agentId}:${enhancement.imageId}`,
    ),
      submission = snapshot.submissions.find(
        (item) => item.submissionId === enhancement.submissionId,
      );
    if (
      submission &&
      (submission.status === DesignerCaseStatus.RETAKE_REQUIRED ||
        submission.status === DesignerCaseStatus.REUPLOAD_REQUIRED) &&
      !asset
    )
      continue;
    images.set(`${enhancement.agentId}:${enhancement.imageId}`, {
      key: `enhancement-${enhancement.enhancementId}`,
      agentId: enhancement.agentId,
      imageId: enhancement.imageId,
      sourceType: asset?.sourceType ?? "ai_enhanced",
      category: submission?.photoCategory,
      status: asset
        ? "approved"
        : pendingStatuses.has(enhancement.status)
          ? "pending"
          : "uploaded",
      score:
        asset?.marketingReadiness ?? enhancement.enhancedMarketingReadiness,
      at: asset?.approvedAt ?? enhancement.createdAt,
      asset,
    });
  }
  for (const asset of snapshot.assets) {
    const key = `${asset.agentId}:${asset.imageId}`,
      current = images.get(key);
    images.set(
      key,
      current
        ? {
            ...current,
            status: "approved",
            sourceType: asset.sourceType,
            score: asset.marketingReadiness ?? current.score,
            at: asset.approvedAt,
            asset,
          }
        : {
            key: `asset-${asset.assetId}`,
            agentId: asset.agentId,
            imageId: asset.imageId,
            sourceType: asset.sourceType,
            status: "approved",
            category: snapshot.submissions.find(
              (item) => item.submissionId === asset.submissionId,
            )?.photoCategory,
            score: asset.marketingReadiness ?? 0,
            at: asset.approvedAt,
            asset,
          },
    );
  }
  return [...images.values()].sort((a, b) => b.at.localeCompare(a.at));
}
function imageGroups(snapshot: DesignerSnapshot, images: LibraryImage[]) {
  const agentMap = new Map(
    snapshot.agents.map((agent) => [agent.agentId, agent]),
  );
  for (const submission of snapshot.submissions)
    if (!agentMap.has(submission.agentId))
      agentMap.set(submission.agentId, {
        agentId: submission.agentId,
        name: submission.agentName,
        teamName: submission.teamNameAtSubmission || "Unassigned",
        ren: "",
        avatarUrl: "",
      });
  const imageAgents = [...agentMap.values()].filter((agent) =>
      images.some((image) => image.agentId === agent.agentId),
    ),
    teams = groupAgentsByTeam(imageAgents);
  return teams.map((group) => ({
    team: group.team,
    imageCount: group.agents.reduce(
      (total, agent) =>
        total +
        images.filter((image) => image.agentId === agent.agentId).length,
      0,
    ),
    agents: group.agents.map((agent) => ({
      agent,
      images: images.filter((image) => image.agentId === agent.agentId),
    })),
  }));
}
function mergeAgents(local: DesignerAgent[], remote: DesignerAgent[]) {
  const merged = new Map<string, DesignerAgent>();
  [...remote, ...local].forEach((agent) => merged.set(agent.agentId, agent));
  return [...merged.values()];
}
function agentName(snapshot: DesignerSnapshot, id: string) {
  return (
    snapshot.agents.find((agent) => agent.agentId === id)?.name ??
    snapshot.submissions.find((item) => item.agentId === id)?.agentName ??
    id
  );
}
function categoryLabel(name: string) {
  return (
    {
      photoQuality: "Photo quality",
      bodyCrop: "Body & crop",
      faceVisibility: "Face visibility",
      backgroundEditability: "Background & editability",
    }[name] ?? name
  );
}
function statusLabel(status: string) {
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .replace(/\bAi\b/g, "AI");
}
function libraryStatusLabel(status: LibraryImage["status"]) {
  return {
    pending: "Pending approval",
    approved: "Approved",
    retake: "Retake required",
    reupload: "Re-upload required",
    uploaded: "Uploaded",
  }[status];
}
function actionLabel(
  action: DesignerAction,
  enhancement?: DesignerEnhancement,
) {
  return {
    approve_original: "Approve the original photo",
    approve_enhanced: "Approve the AI-enhanced portrait",
    reject_enhancement: "Reject the AI photo and ask for a new one",
    retake: "Ask the agent for a new photo",
    reupload: "Ask the agent for a better-quality file",
    keep_review: `Decide later — keep this ${enhancement ? "AI-enhanced " : ""}case in the queue`,
  }[action];
}
