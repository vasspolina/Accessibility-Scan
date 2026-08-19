import { useState, type ReactNode } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { FactCard } from "../components/FactCard";
import { FindingDetail } from "../components/FindingDetail";
import { IssueRow } from "../components/IssueRow";
import { RelatedChecks } from "../components/RelatedChecks";
import { ScoreDial } from "../components/ScoreDial";
import { SeverityTag } from "../components/SeverityTag";

/**
 * Component gallery, ported from "Accessible Scan - Component Cards.html".
 *
 * Dev-only: nothing imports this from the widget entry, so it adds no bytes to
 * the shipped bundle. Served at /gallery.html by the dev server.
 *
 * The demo props and the note under each card are the design file's own, kept
 * word for word. That is deliberate — if a component renders differently here
 * than it does in the design's gallery, the difference is the port's, and this
 * page is where it shows. Nothing on this page restyles a component.
 *
 * Thirty-five components are in the design system; nine are ported. The rest
 * get a "not ported yet" card rather than being left out, so the gallery is
 * also the migration's checklist. The design file does the same thing with its
 * own <Unavailable> fallback for anything missing from its bundle.
 */

function Cd({
  name,
  note,
  wide,
  children,
}: {
  name: string;
  note?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <article className={"a11y-gallery-card" + (wide ? " a11y-gallery-wide" : "")}>
      <header>
        <b>{name}</b>
      </header>
      <div className="a11y-gallery-stage">{children}</div>
      {note ? <p className="a11y-gallery-note">{note}</p> : null}
    </article>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="a11y-gallery-group">
      {/* h2 under the page's single h1 — the gallery is a document, and a
          reader tabbing by heading should get the group names. */}
      <h2>{title}</h2>
      <div className="a11y-gallery-grid">{children}</div>
    </section>
  );
}

/** Stands in for a component the design system has and this repo has not. */
function NotPorted({ name, source }: { name: string; source: string }) {
  return (
    <div className="a11y-gallery-missing">
      {name} is not ported yet — the design has it at <code>{source}</code>.
    </div>
  );
}

function TableDemo() {
  const [filter, setFilter] = useState("Everything");
  return (
    <DataTable
      framed
      filters={["Everything", "Perceivable", "Operable", "Understandable", "Robust"]}
      filter={filter}
      onFilterChange={setFilter}
      headers={[
        { key: "issue", label: "What we found" },
        { key: "criterion", label: "Criterion" },
        { key: "count", label: "Places", align: "right" },
      ]}
      rows={[
        {
          id: "1",
          cells: ["Icons have no description", "WCAG 1.1.1", "14"],
          expand:
            "Often the icon is the only label on a control: a magnifying glass for search, a basket for the cart. A screen reader reaches it and has nothing to announce.",
        },
        {
          id: "2",
          cells: ["Links marked by colour alone", "WCAG 1.4.1", "6"],
          expand: "Readers who are colour blind can't tell a link from ordinary text.",
        },
        {
          id: "3",
          cells: ["A dropdown has no label", "WCAG 3.3.2", "2"],
          expand: "People can't tell what they're choosing. Errors and dropped forms follow.",
        },
      ]}
    />
  );
}

export function Gallery() {
  return (
    <div className="a11y-gallery">
      <div className="a11y-gallery-wrap">
        <header className="a11y-gallery-mast">
          <div>
            <p>Accessible Scan · component cards · August 2026</p>
            <h1>
              Component
              <br />
              cards
            </h1>
          </div>
          <p>
            Every ported component, live, carrying the product's own words. Usage notes under
            each card.
          </p>
        </header>

        <Group title="Actions">
          <Cd
            name="Button"
            note="Pill primary in accent red; secondary is a 2px outline. One primary per view."
          >
            <div className="a11y-gallery-row">
              <Button>Check my site</Button>
              <Button variant="secondary">Save as PDF</Button>
              <Button variant="ghost">Read the criterion</Button>
            </div>
            <div className="a11y-gallery-row">
              <Button variant="danger">Delete this scan</Button>
              <Button variant="black">Open the report</Button>
              <Button disabled>Check my site</Button>
            </div>
          </Cd>
          <Cd
            name="IconButton"
            note="Icon-only; label is required and becomes the accessible name. 44px target."
          >
            <NotPorted name="IconButton" source="components/actions/IconButton.jsx" />
          </Cd>
        </Group>

        <Group title="Display">
          <Cd
            name="SeverityTag"
            note="Solid pill, word only. Fixed fills with verified white text (4.6–7.4:1)."
          >
            <div className="a11y-gallery-row">
              <SeverityTag severity="critical" />
              <SeverityTag severity="serious" />
              <SeverityTag severity="moderate" />
              <SeverityTag severity="minor" />
              <SeverityTag severity="pass" />
            </div>
          </Cd>
          <Cd name="Card" note="Flat panel. Use tone=invert for one emphasis card per screen.">
            <Card title="What this tells you">
              <span>
                What your site gets wrong, not what it gets right.
              </span>
            </Card>
          </Cd>
          <Cd
            name="Tag / Badge"
            note="Tag for neutral facts, Badge for counts. Severity uses SeverityTag instead."
          >
            <NotPorted name="Tag and Badge" source="components/display/{Tag,Badge}.jsx" />
          </Cd>
          <Cd name="SpecList" note="Read-only metadata. Set columns to 2–4 for wide blocks.">
            <NotPorted name="SpecList" source="components/display/SpecList.jsx" />
          </Cd>
          <Cd
            name="IndexList"
            note="Signage logic: black disc numeral, name at heading size, qualifier in gray."
          >
            <NotPorted name="IndexList" source="components/display/IndexList.jsx" />
          </Cd>
          <Cd
            name="SectionHead"
            note="variant=page for an article opener; variant=band for a metadata row over a display statement."
          >
            <NotPorted name="SectionHead" source="components/display/SectionHead.jsx" />
          </Cd>
          <Cd
            name="FactCard"
            wide
            note="Label plus a display value or a lines stack. At most one accent and one invert card per row."
          >
            <div className="a11y-gallery-cols">
              <FactCard tone="accent" label="Places affected" value={63} note="Across 42 pages" />
              <FactCard label="We couldn't check" value={22} note="Only a person can judge these" />
              <FactCard
                tone="invert"
                label="Fixed since last check"
                value={7}
                note="Down from 41 findings"
              />
            </div>
          </Cd>
          <Cd
            name="DataTable"
            wide
            note="Header labels float above spaced white card rows; hover inverts; expansion opens a black panel."
          >
            <TableDemo />
          </Cd>
        </Group>

        <Group title="Scan">
          <Cd
            name="ScoreDial"
            note="Band word on a corner pill, score bottom-left, meter ticked at 70 and 90."
          >
            <ScoreDial score={84} />
          </Cd>
          <Cd
            name="IssueRow"
            wide
            note="Gray card row: severity pill, plain-language title, count set large. Inverts on hover and focus."
          >
            <IssueRow
              severity="critical"
              title="Icons have no description"
              criterion="WCAG 1.1.1"
              selector="svg.icon"
              count={14}
            />
            <IssueRow
              severity="serious"
              title="Links marked by colour alone"
              criterion="WCAG 1.4.1"
              selector=".prose a"
              count={6}
            />
            <IssueRow
              severity="moderate"
              title="Headings skip levels"
              criterion="WCAG 1.3.1"
              selector="h4"
              count={3}
            />
          </Cd>
          <Cd name="RelatedChecks" wide note="Two to four onward links, each with a reason.">
            <RelatedChecks
              items={[
                {
                  id: "1.4.11",
                  name: "Non-text contrast",
                  level: "AA",
                  why: "Same colours, applied to controls and icons",
                },
                {
                  id: "1.4.6",
                  name: "Contrast (enhanced)",
                  level: "AAA",
                  why: "Advanced: a good idea, not required or scored",
                },
                {
                  id: "1.4.12",
                  name: "Text spacing",
                  level: "AA",
                  why: "Often fails wherever contrast does",
                },
              ]}
            />
          </Cd>
          <Cd
            name="FindingDetail — band"
            wide
            note="Metadata header, the fix set as display type, action pill at the right. tone=invert puts it on black. The badge is a SeverityTag rather than the design's plain string, so a Serious finding is not painted the same red as a Critical one."
          >
            <FindingDetail
              tone="invert"
              eyebrow="Dark pattern"
              badge={<SeverityTag severity="serious" onDark />}
              meta="1 place · homepage"
              whatFound="A countdown implies the offer expires, and it resets on reload."
              whatToDo="Remove the countdown or make it truthful."
              actionLabel="Open the check"
              affected="[data-countdown]"
              technical="Countdowns that reset on reload are a deceptive practice. Once noticed, nothing else you claim is believed."
            />
          </Cd>
          <Cd
            name="FindingDetail — plain"
            wide
            note="Row-expansion shape: labelled answers, black code block with a Copy pill, nested technical disclosure."
          >
            <FindingDetail
              who="No code needs to change — this is a decision about wording."
              whatFound="Six links inside running text are marked only by colour, with no underline."
              whatToDo="Underline links inside paragraphs, or mark them some other way that does not depend on colour."
              affected=".prose a"
              technical="Readers who are colour blind can't tell a link from ordinary text."
            />
          </Cd>
          <Cd
            name="SiteAudit / ScreenReaderPreview / VisionSimulator / WhatsNextPanel / AccessibilityStatementBuilder"
            wide
            note="The app has its own version of each of these. They are not ports — their markup and behaviour predate the design system, so they are not on this page."
          >
            <NotPorted
              name="These five"
              source="components/scan/"
            />
          </Cd>
        </Group>

        <Group title="Forms, Feedback, Navigation">
          <Cd
            name="Not ported"
            wide
            note="Input, Textarea, Select, Checkbox, Radio, Switch, OptionCard, Notification, Toast, ProgressBar, Tooltip, Dialog, ShellNav, Tabs and SkipLink are all in the design system and none are ported. The app has its own form controls, dialog, tabs and nav."
          >
            <NotPorted
              name="Fifteen components"
              source="components/{forms,feedback,navigation}/"
            />
          </Cd>
        </Group>
      </div>
    </div>
  );
}
