"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  BadgeCheck,
  BarChart3,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  Globe2,
  Handshake,
  Headphones,
  LayoutDashboard,
  LogIn,
  MapPin,
  Menu,
  MessageSquare,
  QrCode,
  Radar,
  ShieldCheck,
  Upload,
  Users,
  X,
} from "lucide-react";
import { isMissingAvatarUrl } from "../agent-directory";
import {
  atlasPhotoChanged,
  readAtlasProfilePhoto,
  writeAtlasProfilePhoto,
} from "../atlas-profile-photo";
import { atlasAgentSlug, atlasPhotoSrc, mockAgent } from "../mock-agent";
import {
  emptyPhotoRating,
  evaluatePhoto,
  isProfilePhotoVerified,
  PhotoRating,
} from "../photo-quality";
import "./entry.css";

type Agent = {
  id: string;
  name: string;
  role: string;
  team: string;
  office: string;
  phone: string;
  officePhone: string;
  email: string;
  avatar: string;
  renTag: string;
};
const fallbackAgent: Agent = {
  id: "48535",
  name: mockAgent.agentName,
  role: "Team Leader (Subsales) · REN52483",
  team: mockAgent.agentTeam,
  office: "Putrajaya, Malaysia",
  phone: "60165764506",
  officePhone: mockAgent.agentOfficePhone,
  email: "amir.asraf@iqiglobal.com",
  avatar: atlasPhotoSrc,
  renTag: "REN52483",
};

export default function AtlasProfile({
  agentSlug = atlasAgentSlug,
}: {
  agentSlug?: string;
}) {
  const [agent, setAgent] = useState<Agent>(fallbackAgent);
  const [live, setLive] = useState(false);
  const [photo, setPhoto] = useState(atlasPhotoSrc);
  // Keyed by the photo it describes, so switching photos falls back to the empty rating by
  // derivation instead of a setState in an effect body that would cascade an extra render.
  const [assessed, setAssessed] = useState<{
    src: string;
    rating: PhotoRating;
  } | null>(null);
  const [showAssessment, setShowAssessment] = useState(false);
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [qr, setQr] = useState("");
  const [qrError, setQrError] = useState("");
  const [date, setDate] = useState("2026-08-22");
  const [time, setTime] = useState("10:30");
  const file = useRef<HTMLInputElement>(null);
  const isDemoAgent = agentSlug === atlasAgentSlug;
  useEffect(() => {
    const apply = () => {
      const slot = readAtlasProfilePhoto();
      setPhoto(slot.src);
      if (slot.rating && slot.rating.score)
        setAssessed({ src: slot.src, rating: slot.rating });
    };
    apply();
    window.addEventListener(atlasPhotoChanged, apply);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener(atlasPhotoChanged, apply);
      window.removeEventListener("storage", apply);
    };
  }, [agentSlug]);
  useEffect(() => {
    if (!photo) return;
    let active = true;
    evaluatePhoto(photo)
      .then((next) => {
        if (active) setAssessed({ src: photo, rating: next });
      })
      .catch(() => {
        if (active)
          setAssessed({
            src: photo,
            rating: { ...emptyPhotoRating, label: "Could not assess" },
          });
      });
    return () => {
      active = false;
    };
  }, [photo]);
  const rating = assessed?.src === photo ? assessed.rating : emptyPhotoRating;
  useEffect(() => {
    fetch(`/api/atlas-agent?slug=${encodeURIComponent(agentSlug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const liveAvatar = data.avatar_original_url || data.avatar_url || "";
        const avatar = isMissingAvatarUrl(String(liveAvatar))
          ? ""
          : `/api/atlas-avatar?slug=${encodeURIComponent(agentSlug)}`;
        const mapped: Agent = {
          id: String(data.id),
          name: isDemoAgent
            ? mockAgent.agentName
            : data.display_name || data.full_name,
          role:
            [data.designation, data.ren_tag].filter(Boolean).join(" · ") ||
            data.role,
          team: isDemoAgent
            ? mockAgent.agentTeam
            : data.team_name || mockAgent.agentTeam,
          office: `${data.branch_name || data.branch_region_name}, ${data.country}`,
          phone:
            data.mobile_contact_number ||
            data.work_contact_number ||
            "Not provided",
          officePhone:
            data.office_contact_number ||
            data.branch_contact_number ||
            data.branch_phone_number ||
            mockAgent.agentOfficePhone,
          email: data.email || "Not provided",
          avatar: isDemoAgent ? atlasPhotoSrc : avatar,
          renTag: data.ren_tag || "",
        };
        setAgent(mapped);
        setLive(true);
        if (isDemoAgent || !avatar) return;
        setPhoto(avatar);
      })
      .catch(() => {});
  }, [agentSlug, isDemoAgent]);
  const session = useMemo(
    () => `PS-${agent.id}-${date.replaceAll("-", "")}-${time.replace(":", "")}`,
    [agent.id, date, time],
  );
  const appointmentLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(`${date}T${time}`));
    } catch {
      return `${date} · ${time}`;
    }
  }, [date, time]);
  const initials = useMemo(
    () =>
      agent.name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase(),
    [agent.name],
  );
  useEffect(() => {
    if (!confirmed) return;
    let active = true;
    const create = async () => {
      setQr("");
      setQrError("");
      const payload = {
          session,
          agentId: agent.id,
          agentName: agent.name,
          agentPhoto: photo,
          agentMobile: agent.phone,
          agentRenTag: agent.renTag,
          agentOfficePhone: agent.officePhone,
          agentTeam: agent.team,
          rating: rating.score,
          ratingLabel: rating.label,
          ratingMetrics: rating.metrics,
          photoPreflight: rating,
          date,
          time,
        },
        stored = {
          ...payload,
          createdAt: new Date().toISOString(),
          status: "confirmed",
        };
      localStorage.setItem(
        `photostudio-session:${session}`,
        JSON.stringify(stored),
      );
      try {
        const response = await fetch("/api/studio-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw Error();
        const image = await QRCode.toDataURL(session, {
          width: 360,
          margin: 4,
          errorCorrectionLevel: "H",
          color: { dark: "#17221e", light: "#ffffff" },
        });
        if (active) setQr(image);
      } catch {
        if (active)
          setQrError(
            "Could not register this QR. Check the demo server and select Try again.",
          );
      }
    };
    create();
    return () => {
      active = false;
    };
  }, [
    confirmed,
    session,
    date,
    time,
    agent.id,
    agent.name,
    agent.phone,
    agent.renTag,
    agent.officePhone,
    agent.team,
    photo,
    rating,
  ]);
  useEffect(() => {
    if (!booking && !showAssessment) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setBooking(false);
      setShowAssessment(false);
      setConfirmed(false);
      setQr("");
      setQrError("");
    };
    addEventListener("keydown", close);
    return () => removeEventListener("keydown", close);
  }, [booking, showAssessment]);
  const choose = async (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      alert("Choose a JPG, PNG or WebP photo.");
      return;
    }
    if (selected.size > 12 * 1024 * 1024) {
      alert("Choose a photo smaller than 12 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== "string") return;
      const src = reader.result;
      setPhoto(src);
      writeAtlasProfilePhoto(src);
    };
    reader.onerror = () => alert("This photo could not be opened.");
    reader.readAsDataURL(selected);
  };
  const openStudio = () =>
    (location.href = `/?session=${encodeURIComponent(session)}`);
  const verified = isProfilePhotoVerified(rating);
  return (
    <main className="atlas-app">
      <header className="atlas-top">
        <button type="button" className="menu-toggle" aria-label="Menu">
          <Menu />
        </button>
        <div className="atlas-utilities">
          <Globe2 />
          <MessageSquare />
          <Headphones />
          <span className="notice">
            <Bell />
            <i>1</i>
          </span>
          <b>{agent.name}</b>
          <span className="user-dot">{initials}</span>
        </div>
      </header>
      <aside className="atlas-side">
        <Link className="atlas-mark" href="/atlas" prefetch={false}>
          <b>
            <i />
            <i />
            <i />
          </b>
          <span>
            ATLAS<em>Demo profile</em>
          </span>
        </Link>
        <div className="side-search">⌕ &nbsp; Search menu</div>
        <small>QUICK LINKS</small>
        <nav>
          <button type="button">
            <LayoutDashboard />
            <span>Dashboard</span>
          </button>
          <button type="button">
            <Users />
            <span>Team Hub</span>
            <ChevronDown />
          </button>
          <button>
            <BarChart3 />
            <span>Insights & Reports</span>
            <ChevronDown />
          </button>
          <button>
            <Radar />
            <span>Real Estate Radar</span>
            <ChevronDown />
          </button>
          <button>
            <Handshake />
            <span>Engagement Hub</span>
            <ChevronDown />
          </button>
          <button>
            <CalendarDays />
            <span>Calendar</span>
          </button>
          <button>
            <Globe2 />
            <span>Global Network</span>
          </button>
        </nav>
      </aside>
      <section className="atlas-content">
        <div className="atlas-page-title">
          <span>
            <Users />
          </span>
          <h1>Profile</h1>
        </div>
        <div className="atlas-tabs">
          <button type="button" className="active" aria-current="page">
            Profile
          </button>
          <button type="button">Digital Signature</button>
          <button>Change Password</button>
        </div>
        <div className="atlas-heading">
          <div>
            <small>PROFILE · {live ? "LIVE" : "OFFLINE"}</small>
            <h1>Profile</h1>
            <p>Public agent profile.</p>
          </div>
          <button type="button" className="save">
            <Check size={17} /> {live ? "Connected" : "Offline"}
          </button>
        </div>
        {rating.score > 0 && !verified ? (
          <div className={`quality-banner ${!photo ? "empty" : ""}`}>
            <div className="banner-icon">
              <Camera />
            </div>
            <div>
              <strong>
                {!photo
                  ? "Add a profile photo"
                  : rating.status === "REUPLOAD"
                    ? "Re-upload at higher resolution"
                    : rating.status === "REVIEW"
                      ? "Designer review needed"
                      : "Retake recommended"}
              </strong>
              <span>
                {!photo
                  ? "Upload a photo to get it scored."
                  : `${rating.score}/100 · ${rating.recommendation}`}
              </span>
            </div>
          </div>
        ) : null}
        <div className="profile-layout">
          <article className="profile-card">
            <div className="cover">
              <span>GLOBAL NETWORK</span>
            </div>
            <div className="identity">
              <div
                className={`agent-photo ${photo ? "has-photo" : ""}`}
                style={photo ? { backgroundImage: `url(${photo})` } : undefined}
              >
                {verified ? (
                  <span className="photo-verified" title="Verified photo">
                    <BadgeCheck size={14} />
                  </span>
                ) : (
                  <span className={`rating-ring ${rating.tone}`}>
                    {rating.score}
                  </span>
                )}
              </div>
              <div>
                <h2>{agent.name}</h2>
                <p>{agent.role}</p>
                <span>
                  <MapPin size={15} />
                  {agent.office}
                </span>
                {agent.team ? (
                  <span className="agent-team">{agent.team}</span>
                ) : null}
              </div>
            </div>
            {!verified ? (
            <button
              type="button"
              className="photo-score"
              onClick={() => setShowAssessment(true)}
              aria-label="View full photo preflight"
            >
              <div>
                <small>MARKETING PHOTO PREFLIGHT</small>
                <strong>
                  {rating.score}
                  <span>/100</span>
                </strong>
              </div>
              <div className="score-track">
                <i style={{ width: `${rating.score}%` }} />
              </div>
              <b className={rating.tone}>{rating.label}</b>
              <p>
                View feedback <span>→</span>
              </p>
            </button>
            ) : null}
            <div className="atlas-photo-actions">
              <button type="button" onClick={() => file.current?.click()}>
                <Upload size={18} /> Upload
              </button>
              <button
                type="button"
                className="atlas-login"
                onClick={() => {
                  location.href = "/";
                }}
              >
                <LogIn size={18} /> Login to Profile Lab AI
              </button>
              <input
                ref={file}
                name="profile-photo"
                type="file"
                aria-label="Upload profile photo"
                accept="image/jpeg,image/png,image/webp"
                onChange={choose}
              />
            </div>
          </article>
          <article
            className="details-card atlas-skeleton"
            aria-label="Atlas profile modules loading"
          >
            <div className="skeleton-tabs">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="skeleton-title">
              <i />
              <i />
            </div>
            <div className="skeleton-grid">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i}>
                  <i />
                  <b />
                </span>
              ))}
            </div>
            <div className="skeleton-lines">
              <i />
              <i />
              <i />
            </div>
          </article>
        </div>
      </section>
      {showAssessment ? (
        <div
          className="booking-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preflight"
        >
          <div className="booking-card assessment-modal">
            <button
              type="button"
              className="close"
              onClick={() => setShowAssessment(false)}
              aria-label="Close assessment"
            >
              <X />
            </button>
            <small>MARKETING PHOTO PREFLIGHT · {rating.status}</small>
            <h2>
              {rating.score}/100 · {rating.label}
            </h2>
            <p>
              Can a designer actually work with this photo? Judged on usability,
              not formality.
            </p>
            <div className="assessment-signals">
              <div>
                <span>Raw score</span>
                <strong>{rating.raw_score}</strong>
              </div>
              <div>
                <span>Final score</span>
                <strong>{rating.score}</strong>
              </div>
              <div>
                <span>Confidence</span>
                <strong>{Math.round(rating.confidence * 100)}%</strong>
              </div>
              <div>
                <span>Selfie likelihood</span>
                <strong>{Math.round(rating.selfie_probability * 100)}%</strong>
              </div>
            </div>
            <div className="metric-list">
              {rating.metrics.map((metric) => (
                <div className="metric" key={metric.name}>
                  <div>
                    <b>{metric.name}</b>
                    <span>{metric.note}</span>
                    <strong>{metric.score}</strong>
                  </div>
                  <i>
                    <b style={{ width: `${metric.score}%` }} />
                  </i>
                </div>
              ))}
            </div>
            <section
              className="requirement-panel"
              aria-label="Submission requirements"
            >
              <div>
                <b>Submission requirements</b>
                <small>Hard rules run after image analysis</small>
              </div>
              <div className="requirement-list">
                {rating.requirements.map((requirement) => (
                  <article
                    className={requirement.status.toLowerCase()}
                    key={requirement.id}
                  >
                    <span>{requirement.status}</span>
                    <div>
                      <b>{requirement.label}</b>
                      <small>{requirement.detail}</small>
                    </div>
                    <strong>{requirement.score}</strong>
                  </article>
                ))}
              </div>
            </section>
            <div className={`assessment-feedback ${rating.tone}`}>
              <b>Final decision</b>
              <p>{rating.decision_reason}</p>
              {rating.penalties.length ? (
                <ul>
                  {rating.penalties.map((penalty) => (
                    <li key={penalty.id}>
                      {penalty.label}
                      {penalty.points ? ` · −${penalty.points}` : ""}
                      {penalty.cap !== null
                        ? ` · score capped at ${penalty.cap}`
                        : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No penalties or caps applied.</p>
              )}
              <strong>{rating.recommendation}</strong>
            </div>
            <section
              className="score-trace"
              aria-label="How this score was calculated"
            >
              <b>How this score was calculated</b>
              <ol>
                {rating.score_trace.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
            <div className="rating-method">
              <ShieldCheck size={18} />
              <p>
                <b>Designer usability standard</b>
                <span>
                  Photo quality 30 · Body &amp; crop 30 · Face visibility 20 ·
                  Background &amp; editability 20 · then hard gates. Sitting,
                  leaning and casual poses are never penalised.
                </span>
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {booking ? (
        <div
          className="booking-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Book studio session"
        >
          <div className="booking-card">
            <button
              type="button"
              className="close"
              onClick={() => {
                setBooking(false);
                setConfirmed(false);
                setQr("");
                setQrError("");
              }}
              aria-label="Close"
            >
              <X />
            </button>
            {!confirmed ? (
              <>
                <span className="modal-icon">
                  <Camera />
                </span>
                <small>STUDIO</small>
                <h2>Book studio</h2>
                <p>Choose a time. Scan at arrival.</p>
                <div className="booking-fields">
                  <label>
                    Date
                    <input
                      name="appointment-date"
                      autoComplete="off"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                  <label>
                    Time
                    <select
                      name="appointment-time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    >
                      <option>09:30</option>
                      <option>10:30</option>
                      <option>14:00</option>
                      <option>16:30</option>
                    </select>
                  </label>
                </div>
                <div className="booking-location">
                  <MapPin />
                  <div>
                    <b>Profile Lab AI</b>
                    <span>Kuala Lumpur · Level 12</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="confirm"
                  onClick={() => setConfirmed(true)}
                >
                  Book session
                </button>
              </>
            ) : (
              <>
                <span className="modal-icon success">
                  <QrCode />
                </span>
                <small>CONFIRMED</small>
                <h2>Studio QR</h2>
                <p>Scan at Profile Lab AI.</p>
                <div className="qr-wrap" aria-live="polite">
                  {qr ? (
                    <img
                      src={qr}
                      alt={`Studio appointment QR for ${agent.name}`}
                      width={360}
                      height={360}
                    />
                  ) : (
                    <span className="qr-loading">Creating QR…</span>
                  )}
                </div>
                <div className="session-code">
                  <small>SESSION CODE</small>
                  <code translate="no">{session}</code>
                  <span>Use if QR scanning fails.</span>
                </div>
                {qrError ? <p className="qr-error">{qrError}</p> : null}
                <div className="appointment-meta">
                  <div>
                    <small>AGENT</small>
                    <b>{agent.name}</b>
                  </div>
                  <div>
                    <small>TIME</small>
                    <b>{appointmentLabel}</b>
                  </div>
                </div>
                <button
                  type="button"
                  className="confirm"
                  disabled={!qr}
                  onClick={openStudio}
                >
                  <QrCode size={18} /> Open studio
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
