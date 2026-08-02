import { useState } from "react";

// Shows the owner their own page as some of their visitors see it. Reading
// "contrast is too low" is abstract; watching your call-to-action vanish into
// its background is not — and that shift from compliance language to lived
// experience is what actually gets things fixed.
//
// One screenshot, re-filtered in the browser. No server round-trip per
// condition, and nothing leaves the page.
//
// The colour matrices are the standard Machado/Oliveira/Fernandes
// dichromacy simulation coefficients, the same ones Chrome DevTools and
// Firefox use for their vision-deficiency emulation. Worth being precise
// about: these approximate the *most common* form of each condition, and
// severity varies between individuals. The panel says so rather than
// implying it reproduces any particular person's sight.

interface Condition {
  id: string;
  label: string;
  // Share of the population, where there's a well-established figure.
  prevalence?: string;
  note: string;
  // An SVG feColorMatrix, a CSS filter, or both.
  matrix?: string;
  cssFilter?: string;
}

const CONDITIONS: Condition[] = [
  {
    id: "none",
    label: "Normal vision",
    note: "Your page as most visitors see it.",
  },
  {
    id: "deuteranopia",
    label: "Deuteranopia",
    prevalence: "~6% of men",
    note: "Reduced sensitivity to green, the most common form of colour blindness. Red and green become hard to tell apart.",
    matrix: "0.367 0.861 -0.228 0 0  0.280 0.673 0.047 0 0  -0.012 0.043 0.969 0 0  0 0 0 1 0",
  },
  {
    id: "protanopia",
    label: "Protanopia",
    prevalence: "~1% of men",
    note: "Reduced sensitivity to red. Reds darken and can disappear against dark backgrounds.",
    matrix: "0.152 1.053 -0.205 0 0  0.115 0.786 0.099 0 0  -0.004 -0.048 1.052 0 0  0 0 0 1 0",
  },
  {
    id: "tritanopia",
    label: "Tritanopia",
    prevalence: "rare",
    note: "Reduced sensitivity to blue. Blues and yellows are confused.",
    matrix: "1.256 -0.077 -0.179 0 0  -0.078 0.931 0.148 0 0  0.005 0.691 0.304 0 0  0 0 0 1 0",
  },
  {
    id: "achromatopsia",
    label: "No colour vision",
    prevalence: "very rare",
    note: "No colour at all. A useful worst case: anything that relies on colour alone disappears completely here.",
    cssFilter: "grayscale(1)",
  },
  {
    id: "lowvision",
    label: "Low vision",
    prevalence: "~1 in 30 people",
    note: "Reduced acuity, far more common than total blindness. Small text and thin type lose their edges.",
    cssFilter: "blur(2.2px)",
  },
  {
    id: "cataracts",
    label: "Cataracts",
    prevalence: "common over 60",
    note: "Clouded vision and faded contrast. Text with low contrast is the first thing to go.",
    cssFilter: "blur(1.6px) contrast(0.68) brightness(1.12)",
  },
];

export function VisionSimulator({ pagePreview, url }: { pagePreview: string; url: string }) {
  const [active, setActive] = useState(CONDITIONS[0]);

  return (
    <section className="a11y-section a11y-sim">
      <h2 className="a11y-section-title">Your page, through other eyes</h2>
      <p className="a11y-section-desc">
        One man in twelve is colour blind. Switch between views and watch what your page loses.
        Close approximations. Nobody's sight is exactly this.
      </p>

      <div className="a11y-sim-controls" role="group" aria-label="Vision condition">
        {CONDITIONS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`a11y-sim-btn${active.id === c.id ? " a11y-sim-btn-active" : ""}`}
            aria-pressed={active.id === c.id}
            onClick={() => setActive(c)}
          >
            {c.label}
            {c.prevalence && <em>{c.prevalence}</em>}
          </button>
        ))}
      </div>

      <p className="a11y-sim-note">{active.note}</p>

      {/* One hidden SVG holding every colour matrix; the image references the
          active one by id. Cheaper than rebuilding a filter on each change,
          and keeps the matrices declarative. */}
      <svg className="a11y-sim-defs" aria-hidden="true" focusable="false">
        <defs>
          {CONDITIONS.filter((c) => c.matrix).map((c) => (
            <filter key={c.id} id={`a11y-sim-${c.id}`} colorInterpolationFilters="linearRGB">
              <feColorMatrix type="matrix" values={c.matrix} />
            </filter>
          ))}
        </defs>
      </svg>

      <div className="a11y-sim-frame">
        <img
          className="a11y-sim-img"
          src={`data:image/jpeg;base64,${pagePreview}`}
          alt={`Top of ${url} simulated as seen with ${active.label.toLowerCase()}`}
          style={{
            filter: active.matrix
              ? `url(#a11y-sim-${active.id})`
              : (active.cssFilter ?? "none"),
          }}
        />
      </div>
      <p className="a11y-sim-caption">
        This shows the top of the page, as first loaded.
      </p>
    </section>
  );
}
