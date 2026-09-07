import { useEffect, useId, useState } from "react";
import { t } from "../lib/strings";
import { Select } from "./Select2";
import { Textarea } from "./Textarea";
import { Input } from "./Input";
import { Button } from "./Button";
import { Notification } from "./Feedback";
import {
  fetchQuestions,
  recordVerdict,
  ScanError,
  type GuidedQuestion,
  type QuestionsResult,
  type RecordedVerdict,
} from "../api/scanClient";
import { getDecidedBy, setDecidedBy } from "../lib/apiKey";

/**
 * Guided manual testing: the questions the scan could not answer, with a
 * way to answer them.
 *
 * The conformance table already names what needs a person. What it never
 * offered was anywhere to say what that person found — so the conformance
 * report for buyers stayed blank on every row a scan cannot decide, however
 * much work had been done on the site. An answer recorded here belongs to
 * the SITE, holds for every later scan until someone changes it, and is
 * signed: a verdict nobody stands behind is not evidence.
 *
 * Shown only for a signed-in account, because a verdict has to belong to
 * somebody. The list comes from the server's most recent stored scan of
 * this site, so it shrinks by itself as the scanner learns to decide more.
 */
const STATUS_OPTIONS: Array<{ value: RecordedVerdict["status"]; label: string }> = [
  { value: "supports", label: t("Yes. It meets this") },
  { value: "partially-supports", label: t("Partly") },
  { value: "does-not-support", label: t("No. It fails this") },
  { value: "not-applicable", label: t("Does not apply to this site") },
  { value: "unresolved", label: t("Looked, could not decide yet") },
];

const STATUS_WORD: Record<RecordedVerdict["status"], string> = {
  supports: "Meets it",
  "partially-supports": "Partly",
  "does-not-support": "Fails it",
  "not-applicable": "Does not apply",
  unresolved: "Undecided",
};

export function statusWord(s: RecordedVerdict["status"]): string {
  return t(STATUS_WORD[s]);
}

export function ManualChecks({
  apiBase,
  pageUrl,
  onVerdict,
}: {
  apiBase: string;
  pageUrl: string;
  /** A verdict was recorded — the report's own copy should learn of it. */
  onVerdict: (v: RecordedVerdict) => void;
}) {
  const [data, setData] = useState<QuestionsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchQuestions(apiBase, pageUrl)
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ScanError ? err.message : t("Could not load the open questions."));
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, pageUrl]);

  function recorded(v: RecordedVerdict) {
    setData((d) =>
      d
        ? {
            ...d,
            questions: d.questions.map((q) => (q.criterion === v.criterion ? { ...q, answered: v } : q)),
            answered: d.questions.filter((q) => q.criterion === v.criterion || q.answered).length,
            open: d.questions.filter((q) => q.criterion !== v.criterion && !q.answered).length,
          }
        : d
    );
    setOpen(null);
    onVerdict(v);
  }

  if (error) {
    return (
      <section className="a11y-section" aria-labelledby="a11y-manual-heading">
        <div className="a11y-section-head">
          <h2 className="a11y-section-title" id="a11y-manual-heading" data-nav-label={t("Manual checks")}>
            Manual checks
          </h2>
        </div>
        <Notification kind="warning" title={t("Could not load the open questions")} subtitle={error} />
      </section>
    );
  }
  if (!data) return null;

  return (
    <section className="a11y-section" aria-labelledby="a11y-manual-heading">
      <div className="a11y-section-head">
        <h2 className="a11y-section-title" id="a11y-manual-heading" data-nav-label={t("Manual checks")}>
          Manual checks{" "}
          <span className="a11y-section-count">
            ({data.open} {t("open")}, {data.answered} {t("answered")})
          </span>
        </h2>
        <p className="a11y-section-desc">
          {t("No software can decide these. Each one is a question about your site, not this page, so an answer holds for every later scan until you change it.")}
        </p>
        <p className="a11y-section-desc">
          {t("Answers are signed and kept with their history. They fill the conformance report for buyers, which a scan alone can never complete.")}
        </p>
      </div>
      <ul className="a11y-manual-list">
        {data.questions.map((q) => (
          <li key={q.criterion} className={`a11y-manual-row${q.answered ? " a11y-manual-answered" : ""}`}>
            <span className="a11y-conf-id">
              {q.criterion} <em>{q.level}</em>
            </span>
            <span className="a11y-conf-body">
              <strong>{q.question}</strong>
              <span className="a11y-conf-plain">{t("Officially:")} {q.name}</span>
              <span className="a11y-conf-plain">{q.whyAsking}</span>
              {q.answered && (
                <span className="a11y-manual-verdict">
                  {`${statusWord(q.answered.status)}${q.answered.note ? ` — ${q.answered.note}` : ""} `}
                  <em>
                    ({q.answered.decidedBy}, {q.answered.decidedAt.slice(0, 10)})
                  </em>
                </span>
              )}
            </span>
            <span className="a11y-manual-actions">
              {open === q.criterion ? (
                <AnswerForm
                  apiBase={apiBase}
                  origin={data.origin}
                  pageUrl={pageUrl}
                  question={q}
                  onDone={recorded}
                  onCancel={() => setOpen(null)}
                />
              ) : (
                <Button variant={q.answered ? "ghost" : "secondary"} size="sm" onClick={() => setOpen(q.criterion)}>
                  {q.answered ? t("Change answer") : t("Answer")}
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AnswerForm({
  apiBase,
  origin,
  pageUrl,
  question,
  onDone,
  onCancel,
}: {
  apiBase: string;
  origin: string;
  pageUrl: string;
  question: GuidedQuestion;
  onDone: (v: RecordedVerdict) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [status, setStatus] = useState<RecordedVerdict["status"]>(question.answered?.status ?? "supports");
  const [note, setNote] = useState(question.answered?.note ?? "");
  const [name, setName] = useState(getDecidedBy());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("Sign the answer with your name. A decision nobody stands behind is not evidence."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setDecidedBy(name);
      const v = await recordVerdict(apiBase, {
        origin,
        criterion: question.criterion,
        status,
        note: note.trim() || undefined,
        decidedBy: name.trim(),
        pageUrl,
      });
      onDone(v);
    } catch (err) {
      setError(err instanceof ScanError ? err.message : t("Could not save the answer."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="a11y-manual-form" onSubmit={save} aria-label={`Answer for ${question.criterion}`}>
      <Select
        id={`${id}-status`}
        label={t("Your answer")}
        options={STATUS_OPTIONS}
        value={status}
        onChange={(e) => setStatus(e.target.value as RecordedVerdict["status"])}
      />
      <Textarea
        id={`${id}-note`}
        label={t("What you checked, in a sentence")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        helperText={t("Goes into the conformance report as the remark for this row.")}
      />
      <Input
        id={`${id}-name`}
        label={t("Your name")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        invalid={Boolean(error)}
        invalidText={error ?? undefined}
      />
      <div className="a11y-manual-form-actions">
        <Button variant="primary" size="sm" type="submit" disabled={busy}>
          {busy ? t("Saving…") : t("Save answer")}
        </Button>
        <Button variant="ghost" size="sm" type="button" onClick={onCancel} disabled={busy}>
          {t("Cancel")}
        </Button>
      </div>
    </form>
  );
}
