import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { modalOverlay, modalPanel } from "../../lib/animations";
import { submitRSVP, fetchDietaryOptions, type DietaryOption } from "../../lib/supabase";
import {
  clearInvite,
  getInvite,
  resolveInvitation,
  storeInvite,
  type ResolvedInvite,
} from "../../lib/invitations";
import { stopScroll, startScroll } from "../../lib/scroll";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import type { DotLottie } from "@lottiefiles/dotlottie-web";

// ============================================================
//  RSVP
// ============================================================
//  Every RSVP belongs to one invitation. A guest who arrived through their
//  personal link is already identified; anyone else types their code first.
//  The database accepts one reply per invitation, for no more people than it
//  allows, so a reused or forwarded link lands on "you've already replied".
//
//  Colours: the form follows the visitor's system light or dark mode. Every
//  colour below has a dark: twin. Without them, browsers with automatic dark
//  mode (Chrome, Edge) inverted the cream panel on their own and left faint
//  labels and invisible borders.
//
//  The panel has a solid background colour under its gradient on purpose. Some
//  setups (dark-mode extensions, forced dark) drop background gradients, and
//  with only a gradient the panel went see-through: dark text on the dark
//  backdrop, unreadable.
// ============================================================

interface Props {
  open: boolean;
  onClose: () => void;
}

interface PersonDietary {
  selectedIds: Set<number>;
  other: string;
}

interface FieldErrors {
  name?: string;
  email?: string;
  /** Guest places with neither a name nor "Not applicable" ticked. */
  guestNames?: number[];
}

type Stage = "code" | "form" | "replied";

const stageFor = (invite: ResolvedInvite | null): Stage =>
  !invite ? "code" : invite.responded ? "replied" : "form";

// Shared colour recipes, so light and dark stay paired everywhere.
const TEXT = "text-dark dark:text-cream";
const LABEL = "text-dark/50 dark:text-cream/60";
const MUTED = "text-dark/45 dark:text-cream/55";
const LINE = "border-dark/10 dark:border-cream/20";
const PLACEHOLDER = "placeholder:text-dark/30 dark:placeholder:text-cream/35";
const CARD = "bg-dark/[0.03] border-dark/[0.08] dark:bg-cream/[0.04] dark:border-cream/10";
const ERROR_TEXT = "text-[#C8554B] dark:text-[#E58A80]";
const ERROR_LINE = "border-[#C8554B]/50 dark:border-[#E58A80]/60";

function DietaryPicker({
  label,
  options,
  dietary,
  onChange,
}: {
  label: string;
  options: DietaryOption[];
  dietary: PersonDietary;
  onChange: (d: PersonDietary) => void;
}) {
  const toggle = (id: number) => {
    const next = new Set(dietary.selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange({ ...dietary, selectedIds: next });
  };

  return (
    <div className={`border rounded-sm p-4 ${CARD}`}>
      <p className={`text-[11px] font-medium tracking-[2px] uppercase mb-2.5 ${LABEL}`}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            aria-pressed={dietary.selectedIds.has(opt.id)}
            onClick={() => toggle(opt.id)}
            className={`px-2.5 py-1 text-[10px] tracking-[0.5px] border rounded-sm transition-all duration-200 ${
              dietary.selectedIds.has(opt.id)
                ? "bg-accent/15 border-accent/40 text-accent dark:bg-accent/25 dark:border-accent/60 dark:text-[#7FC0CF]"
                : "bg-transparent border-dark/10 text-dark/50 hover:border-dark/25 dark:border-cream/20 dark:text-cream/65 dark:hover:border-cream/40"
            }`}
          >
            {opt.name}
          </button>
        ))}
      </div>
      <input
        className={`w-full mt-2.5 py-2 bg-transparent border-b text-[13px] font-light focus:border-accent/40 transition-colors duration-200 outline-none ${LINE} ${TEXT} ${PLACEHOLDER}`}
        placeholder="Other..."
        value={dietary.other}
        onChange={(e) => onChange({ ...dietary, other: e.target.value })}
      />
    </div>
  );
}

const emptyDietary = (): PersonDietary => ({ selectedIds: new Set(), other: "" });

/** "Song you'd like to hear at the wedding": asked of every person on the RSVP. */
function SongRequest({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={`border rounded-sm p-4 ${CARD}`}>
      <p className={`text-[11px] font-medium tracking-[2px] uppercase mb-1 ${LABEL}`}>{label}</p>
      <p className={`text-[12px] font-light mb-2.5 ${MUTED}`}>
        One song that has to be played. Title and artist, if you can.
      </p>
      <input
        className={`w-full py-2 bg-transparent border-b text-[13px] font-light focus:border-accent/40 transition-colors duration-200 outline-none ${LINE} ${TEXT} ${PLACEHOLDER}`}
        placeholder="e.g. Fleetwood Mac, Everywhere"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function EnvelopeAnimation({ onComplete }: { onComplete?: () => void }) {
  const handleRef = (dotLottie: DotLottie | null) => {
    if (!dotLottie) return;
    const onLoad = () => {
      dotLottie.setMode("forward");
      dotLottie.setSpeed(1.15);
      dotLottie.setFrame(0);
      dotLottie.play();
    };
    const onFinish = () => {
      // Hold on the sealed envelope briefly, then signal completion
      setTimeout(() => onComplete?.(), 600);
    };
    dotLottie.addEventListener("load", onLoad);
    dotLottie.addEventListener("complete", onFinish);
  };

  return (
    <div className="w-72 md:w-80 mx-auto">
      <DotLottieReact
        src="/envelope.lottie"
        loop={false}
        dotLottieRefCallback={handleRef}
        style={{ width: "100%", height: "auto" }}
      />
    </div>
  );
}

export default function RSVPModal({ open, onClose }: Props) {
  // Name and email are pre-filled from the invitation because we already know
  // them, but everything we do NOT know yet (dietary needs, who their plus-one
  // is) stays empty, and the pre-filled fields remain editable.
  const [invite, setInvite] = useState<ResolvedInvite | null>(() => getInvite());
  const [stage, setStage] = useState<Stage>(() => stageFor(getInvite()));
  const maxAdditional = invite?.maxAdditional ?? 0;

  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [name, setName] = useState(invite?.name ?? "");
  const [email, setEmail] = useState(invite?.email ?? "");
  const [attending, setAttending] = useState(true);
  // Every place the invitation allows gets its own row, and each must have a
  // name or be ticked "Not applicable", so a plus one can't be forgotten.
  const guestCount = maxAdditional;
  const [guestNA, setGuestNA] = useState<boolean[]>([]);
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [myDietary, setMyDietary] = useState<PersonDietary>(emptyDietary());
  const [guestDietary, setGuestDietary] = useState<PersonDietary[]>([]);
  const [mySong, setMySong] = useState("");
  const [guestSongs, setGuestSongs] = useState<string[]>([]);
  const [dietaryOptions, setDietaryOptions] = useState<DietaryOption[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [folding, setFolding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const remember = (next: ResolvedInvite) => {
    storeInvite(next);
    setInvite(next);
  };

  // Fetched when the modal first opens rather than on page load, so simply
  // viewing the site costs no database round-trips at all.
  useEffect(() => {
    if (!open || dietaryOptions.length) return;
    fetchDietaryOptions().then(setDietaryOptions).catch(() => {});
  }, [open, dietaryOptions.length]);

  // Re-check the invitation each time the form opens. The copy saved in this
  // browser dates from when the link was first opened, so by itself it cannot
  // know about an RSVP sent since, from this device or any other.
  useEffect(() => {
    if (!open || !invite) return;
    let active = true;
    resolveInvitation(invite.code)
      .then((fresh) => {
        if (!active) return;
        if (!fresh) {
          clearInvite();
          setInvite(null);
          setStage("code");
          return;
        }
        remember(fresh);
        if (fresh.responded) setStage((s) => (s === "form" ? "replied" : s));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // Only on opening: re-running as `invite` changes would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setGuestNames((prev) => {
      if (guestCount > prev.length) return [...prev, ...Array(guestCount - prev.length).fill("")];
      return prev.slice(0, guestCount);
    });
    setGuestDietary((prev) => {
      if (guestCount > prev.length) return [...prev, ...Array(guestCount - prev.length).fill(null).map(emptyDietary)];
      return prev.slice(0, guestCount);
    });
    setGuestSongs((prev) => {
      if (guestCount > prev.length) return [...prev, ...Array(guestCount - prev.length).fill("")];
      return prev.slice(0, guestCount);
    });
    setGuestNA((prev) => {
      if (guestCount > prev.length) return [...prev, ...Array(guestCount - prev.length).fill(false)];
      return prev.slice(0, guestCount);
    });
  }, [guestCount]);

  const clearGuestError = (i: number) =>
    setFieldErrors((p) =>
      p.guestNames?.includes(i) ? { ...p, guestNames: p.guestNames.filter((x) => x !== i) } : p
    );

  const updateGuestName = (i: number, v: string) => {
    setGuestNames((prev) => { const n = [...prev]; n[i] = v; return n; });
    if (v.trim()) {
      setGuestNA((prev) => { const n = [...prev]; n[i] = false; return n; });
      clearGuestError(i);
    }
  };

  /** "Not applicable": this place won't be used, so its fields are cleared. */
  const toggleNA = (i: number) => {
    const next = !guestNA[i];
    setGuestNA((prev) => { const n = [...prev]; n[i] = next; return n; });
    if (next) {
      setGuestNames((prev) => { const n = [...prev]; n[i] = ""; return n; });
      setGuestDietary((prev) => { const n = [...prev]; n[i] = emptyDietary(); return n; });
      setGuestSongs((prev) => { const n = [...prev]; n[i] = ""; return n; });
      clearGuestError(i);
    }
  };

  const updateGuestDietary = (i: number, d: PersonDietary) => {
    setGuestDietary((prev) => { const n = [...prev]; n[i] = d; return n; });
  };

  const verifyCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setVerifying(true);
    try {
      const found = await resolveInvitation(code);
      if (found) {
        remember(found);
        setGuestNA((prev) => prev.map(() => false));
        if (found.name && !name.trim()) setName(found.name);
        if (found.email && !email.trim()) setEmail(found.email);
        setCodeError(false);
        setStage(stageFor(found));
      } else {
        setCodeError(true);
      }
    } catch {
      setCodeError(true);
    }
    setVerifying(false);
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = "Name is required";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email";
    }
    // Every guest place needs a name, or "Not applicable" ticked on purpose. A
    // plus one left blank used to be dropped without a word, so the couple
    // would never have known they were meant to be coming.
    if (attending && maxAdditional > 0) {
      const missing = guestNames.map((n, i) => (n.trim() || guestNA[i] ? -1 : i)).filter((i) => i >= 0);
      if (missing.length) errors.guestNames = missing;
    }
    setFieldErrors(errors);
    const ok = Object.keys(errors).length === 0;
    if (!ok) {
      // The form is long; bring the first problem into view.
      setTimeout(() => {
        document.querySelector("[data-rsvp] [data-invalid]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
    return ok;
  };

  const handleSubmit = async () => {
    if (!invite) return setStage("code");
    if (!validate()) return;
    setSubmitting(true);
    setError("");
    try {
      await submitRSVP({
        name: name.trim(),
        email: email.trim(),
        attending,
        dietary_option_ids: Array.from(myDietary.selectedIds),
        dietary_other: myDietary.other.trim() || null,
        song_request: mySong.trim() || null,
        invite_code: invite.code,
        plus_ones: guestNames.map((n, i) => ({
          name: guestNA[i] ? "" : n.trim(), // blank names are left out when sending
          dietary_option_ids: Array.from(guestDietary[i]?.selectedIds || []),
          dietary_other: guestDietary[i]?.other.trim() || null,
          song_request: guestSongs[i]?.trim() || null,
        })),
      });
      remember({ ...invite, responded: true });
      // Start envelope fold animation: completion is driven by the lottie callback
      setFolding(true);
    } catch (e) {
      if (e instanceof Error && e.message === "ALREADY_RESPONDED") {
        remember({ ...invite, responded: true });
        setStage("replied");
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    }
    setSubmitting(false);
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      stopScroll();
    } else {
      document.body.style.overflow = "";
      startScroll();
    }
    return () => {
      document.body.style.overflow = "";
      startScroll();
    };
  }, [open]);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setSubmitted(false);
      setFolding(false);
      setStage(stageFor(invite));
      setCodeInput(""); setCodeError(false);
      setName(invite?.name ?? ""); setEmail(invite?.email ?? "");
      setAttending(true); setMyDietary(emptyDietary()); setMySong("");
      setGuestNames(Array(maxAdditional).fill("")); setGuestNA(Array(maxAdditional).fill(false));
      setGuestDietary(Array.from({ length: maxAdditional }, emptyDietary)); setGuestSongs(Array(maxAdditional).fill(""));
      setError(""); setFieldErrors({});
    }, 200);
  };

  const inputBase = `w-full py-3.5 bg-transparent border-b text-[15px] font-light transition-colors duration-300 outline-none ${TEXT} ${PLACEHOLDER}`;
  const labelClass = `block text-[11px] font-medium tracking-[3px] uppercase mb-1.5 ${LABEL}`;
  const firstName = name.trim().split(" ")[0];
  const hasFieldErrors = Boolean(fieldErrors.name || fieldErrors.email || fieldErrors.guestNames?.length);

  return (
    <AnimatePresence>
      {open && (
        <motion.div variants={modalOverlay} initial="hidden" animate="visible" exit="exit"
          className="fixed inset-0 z-[200] flex items-center justify-center" onClick={handleClose}>
          <div className="absolute inset-0 bg-dark/85 backdrop-blur-xl" />

          <motion.div variants={modalPanel} initial="hidden" animate="visible" exit="exit"
            onClick={(e) => e.stopPropagation()}
            data-rsvp
            className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto overscroll-contain border rounded-sm shadow-2xl [color-scheme:light] dark:[color-scheme:dark] bg-cream bg-gradient-to-b from-cream to-warm border-dark/[0.06] dark:bg-[#0F202C] dark:from-[#132736] dark:to-[#0C1A24] dark:border-cream/10"
            data-lenis-prevent>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-dark/[0.06] dark:via-cream/15 to-transparent" />

            <div className="p-8 md:p-12">
              <button onClick={handleClose} aria-label="Close"
                className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center text-dark/30 hover:text-dark/60 dark:text-cream/45 dark:hover:text-cream/80 transition-colors duration-300">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              <AnimatePresence mode="wait">
                {submitted ? (
                  /* ── Success state ── */
                  <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="text-center py-8">
                    <motion.div
                      className="w-14 h-14 rounded-full bg-accent/15 dark:bg-accent/25 flex items-center justify-center mx-auto mb-6"
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}>
                      <motion.svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2E7D8F" strokeWidth="2" strokeLinecap="round">
                        <motion.path d="M20 6L9 17l-5-5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                          transition={{ duration: 0.6, ease: "easeOut", delay: 0.6 }} />
                      </motion.svg>
                    </motion.div>
                    <h3 className={`font-serif text-2xl md:text-3xl font-normal mb-2 ${TEXT}`}>Thank you, {firstName}</h3>
                    <p className="text-sm text-dark/60 dark:text-cream/70 font-light leading-relaxed max-w-xs mx-auto">
                      {attending ? (
                        <>Your RSVP has been sealed and sent.<br />We can't wait to celebrate with you.</>
                      ) : (
                        <>Your response has been sent.<br />We're so sorry you can't make it, and you'll be missed.</>
                      )}
                    </p>
                    <button onClick={handleClose} className="mt-8 text-[12px] tracking-[2px] uppercase text-dark/40 dark:text-cream/50 hover:text-accent transition-colors duration-300">Close</button>
                  </motion.div>

                ) : folding ? (
                  /* ── Envelope animation ── */
                  <motion.div
                    key="envelope"
                    className="flex flex-col items-center justify-center"
                    style={{ minHeight: 320 }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <EnvelopeAnimation onComplete={() => { setFolding(false); setSubmitted(true); }} />
                    <motion.p
                      className="text-[12px] tracking-[3px] uppercase text-dark/40 dark:text-cream/50 mt-4"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      Sealing your RSVP...
                    </motion.p>
                  </motion.div>

                ) : stage === "replied" ? (
                  /* ── This invitation has already been answered ── */
                  <motion.div key="replied" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="text-center py-6">
                    <p className="text-[10px] font-medium tracking-[4px] uppercase text-accent mb-3">Already received</p>
                    <h3 className={`font-serif text-[clamp(26px,5vw,36px)] font-normal leading-tight mb-4 ${TEXT}`}>
                      You've already replied
                    </h3>
                    <p className="text-sm text-dark/60 dark:text-cream/70 font-light leading-relaxed max-w-sm mx-auto">
                      We have the RSVP for {invite?.name ? <>{invite.name}'s invitation</> : "this invitation"}, thank you.
                      Each invitation can be answered once. If something has changed, just send us a
                      message and we'll sort it out.
                    </p>
                    <button onClick={handleClose} className="mt-8 text-[12px] tracking-[2px] uppercase text-dark/40 dark:text-cream/50 hover:text-accent transition-colors duration-300">Close</button>
                  </motion.div>

                ) : (
                  /* ── Form ── */
                  <motion.div key={stage} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                    {stage === "code" ? (
                      <div>
                        <p className="text-[10px] font-medium tracking-[4px] uppercase text-accent mb-2">You're invited</p>
                        <h2 className={`font-serif text-[clamp(28px,5vw,40px)] font-normal leading-tight mb-2 ${TEXT}`}>
                          Your <em className="italic">Invitation Code</em>
                        </h2>
                        <p className="text-sm text-dark/55 dark:text-cream/65 font-light leading-relaxed mb-7">
                          Enter the code from your invitation to continue.
                        </p>
                        <input
                          autoFocus
                          className={`${inputBase} ${codeError ? ERROR_LINE : `${LINE} focus:border-accent/60`} tracking-[3px] uppercase placeholder:tracking-[3px]`}
                          placeholder="Invitation code"
                          value={codeInput}
                          onChange={(e) => { setCodeInput(e.target.value); if (codeError) setCodeError(false); }}
                          onKeyDown={(e) => { if (e.key === "Enter") verifyCode(); }}
                        />
                        {codeError && (
                          <p className={`text-[13px] mt-2 ${ERROR_TEXT}`}>That code isn't recognized. Please check your invitation.</p>
                        )}
                        <button
                          onClick={verifyCode}
                          disabled={!codeInput.trim() || verifying}
                          className="w-full py-4 mt-6 bg-accent text-cream text-[12px] font-semibold tracking-[3px] uppercase transition-all duration-300 hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {verifying ? "Checking..." : "Continue"}
                        </button>
                      </div>
                    ) : (
                    <>
                    <p className="text-[10px] font-medium tracking-[4px] uppercase text-accent mb-2">We hope you can make it</p>
                    <h2 className={`font-serif text-[clamp(28px,5vw,40px)] font-normal leading-tight mb-1 ${TEXT}`}>
                      Kindly Respond
                    </h2>
                    <div className="mb-8" />

                    <div className="flex flex-col gap-5">
                      {/* Name */}
                      <div data-invalid={fieldErrors.name ? true : undefined}>
                        <label className={labelClass}>
                          Full Name *
                          {fieldErrors.name && (
                            <span className={`ml-2 normal-case tracking-normal font-normal ${ERROR_TEXT}`}>· {fieldErrors.name}</span>
                          )}
                        </label>
                        <input
                          className={`${inputBase} ${fieldErrors.name ? ERROR_LINE : `${LINE} focus:border-accent/60`}`}
                          placeholder="Your name"
                          value={name}
                          onChange={(e) => { setName(e.target.value); if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined })); }}
                        />
                      </div>

                      {/* Email */}
                      <div data-invalid={fieldErrors.email ? true : undefined}>
                        <label className={labelClass}>
                          Email Address
                          {fieldErrors.email && (
                            <span className={`ml-2 normal-case tracking-normal font-normal ${ERROR_TEXT}`}>· {fieldErrors.email}</span>
                          )}
                        </label>
                        <input
                          className={`${inputBase} ${fieldErrors.email ? ERROR_LINE : `${LINE} focus:border-accent/60`}`}
                          type="email"
                          placeholder="Optional, for updates about the day"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined })); }}
                        />
                      </div>

                      {/* Attendance */}
                      <div>
                        <label className={labelClass}>Will you be joining us? *</label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <button type="button" onClick={() => setAttending(true)} aria-pressed={attending}
                            className={`py-3.5 text-[11px] font-medium tracking-[2px] uppercase border transition-all duration-300 ${
                              attending
                                ? "bg-accent text-cream border-accent"
                                : "bg-transparent text-dark/50 border-dark/15 hover:border-dark/30 dark:text-cream/60 dark:border-cream/20 dark:hover:border-cream/40"
                            }`}>Joyfully Accept</button>
                          <button type="button" onClick={() => setAttending(false)} aria-pressed={!attending}
                            className={`py-3.5 text-[11px] font-medium tracking-[2px] uppercase border transition-all duration-300 ${
                              !attending
                                ? "bg-dark text-cream border-dark dark:bg-cream dark:text-dark dark:border-cream"
                                : "bg-transparent text-dark/50 border-dark/15 hover:border-dark/30 dark:text-cream/60 dark:border-cream/20 dark:hover:border-cream/40"
                            }`}>Regretfully Decline</button>
                        </div>
                      </div>

                      {attending && (<>
                      {/* Your dietary */}
                      {dietaryOptions.length > 0 && (
                        <DietaryPicker
                          label={firstName ? `Dietary for ${firstName}` : "Your Dietary Requirements"}
                          options={dietaryOptions}
                          dietary={myDietary}
                          onChange={setMyDietary}
                        />
                      )}

                      {/* Song request */}
                      <SongRequest
                        label={firstName ? `Song for ${firstName}` : "Your Song Request"}
                        value={mySong}
                        onChange={setMySong}
                      />

                      {/* Guests: one place per guest the invitation allows */}
                      {maxAdditional > 0 ? (
                      <div>
                        <label className={labelClass}>{maxAdditional === 1 ? "Your Guest" : "Your Guests"}</label>
                        <p className={`text-[12px] font-light ${MUTED}`}>
                          {maxAdditional === 1
                            ? "Your invitation includes one guest. Add their name, or tick Not applicable if you're coming on your own."
                            : `Your invitation includes up to ${maxAdditional} guests. For each one, add their name or tick Not applicable.`}
                        </p>
                      </div>
                      ) : (
                        <p className={`text-[12px] font-light -mt-1 ${MUTED}`}>
                          This invitation is reserved for you alone.
                        </p>
                      )}

                      {/* Per-guest fields */}
                      <AnimatePresence mode="popLayout">
                        {guestNames.map((gn, i) => (
                          <motion.div
                            key={`guest-${i}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="space-y-3"
                          >
                            <div data-invalid={fieldErrors.guestNames?.includes(i) ? true : undefined}>
                              <label className={labelClass}>
                                Guest {i + 1} Full Name *
                                {fieldErrors.guestNames?.includes(i) && (
                                  <span className={`ml-2 normal-case tracking-normal font-normal ${ERROR_TEXT}`}>· Add their name, or tick Not applicable</span>
                                )}
                              </label>
                              <input
                                disabled={Boolean(guestNA[i])}
                                className={`${inputBase} disabled:opacity-40 ${fieldErrors.guestNames?.includes(i) ? ERROR_LINE : `${LINE} focus:border-accent/60`}`}
                                placeholder={guestNA[i] ? "Not bringing a guest" : `Guest ${i + 1} full name`}
                                value={gn} onChange={(e) => updateGuestName(i, e.target.value)} />
                              <label className={`flex items-center gap-2.5 mt-3 cursor-pointer select-none text-[13px] font-light ${
                                fieldErrors.guestNames?.includes(i) ? ERROR_TEXT : "text-dark/70 dark:text-cream/75"
                              }`}>
                                <input type="checkbox" checked={Boolean(guestNA[i])} onChange={() => toggleNA(i)}
                                  className="w-4 h-4 shrink-0 cursor-pointer accent-[#2E7D8F]" />
                                Not applicable, I'm not bringing {maxAdditional === 1 ? "a guest" : "this guest"}
                              </label>
                            </div>
                            {!guestNA[i] && dietaryOptions.length > 0 && (
                              <DietaryPicker
                                label={gn.trim() ? `Dietary for ${gn.trim().split(" ")[0]}` : `Guest ${i + 1} Dietary`}
                                options={dietaryOptions}
                                dietary={guestDietary[i] || emptyDietary()}
                                onChange={(d) => updateGuestDietary(i, d)}
                              />
                            )}
                            {!guestNA[i] && (
                              <SongRequest
                                label={gn.trim() ? `Song for ${gn.trim().split(" ")[0]}` : `Guest ${i + 1} Song`}
                                value={guestSongs[i] || ""}
                                onChange={(v) =>
                                  setGuestSongs((prev) => { const n = [...prev]; n[i] = v; return n; })
                                }
                              />
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      </>)}

                      {/* General error */}
                      {error && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                          className="bg-[#C8554B]/10 border border-[#C8554B]/20 dark:bg-[#E58A80]/10 dark:border-[#E58A80]/30 rounded-sm px-4 py-3 text-center">
                          <p className={`text-sm ${ERROR_TEXT}`}>{error}</p>
                        </motion.div>
                      )}

                      {hasFieldErrors && (
                        <p className={`text-[13px] text-center ${ERROR_TEXT}`}>
                          Nearly there. Please fill in the fields marked in red above.
                        </p>
                      )}

                      <p className={`text-[11px] font-light text-center -mb-1 ${MUTED}`}>
                        You can send this once, so please check everything before you do.
                      </p>

                      {/* Submit */}
                      <motion.button
                        className="w-full py-4 mt-1 bg-accent text-cream text-[12px] font-semibold tracking-[3px] uppercase transition-all duration-300 hover:bg-accent-hover hover:shadow-[0_8px_32px_rgba(46,125,143,0.3)] disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={submitting || folding} onClick={handleSubmit} whileTap={{ scale: 0.98 }}>
                        {submitting ? "Sending..." : attending ? "Accept with Pleasure" : "Send Regrets"}
                      </motion.button>
                    </div>
                    </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
