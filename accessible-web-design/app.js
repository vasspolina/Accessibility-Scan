const banner = document.getElementById("banner");
const bannerClose = document.getElementById("bannerClose");

bannerClose.addEventListener("click", () => {
  banner.setAttribute("hidden", "");
});

const toggle = document.querySelector(".toggle-switch");
toggle.addEventListener("click", () => {
  const checked = toggle.getAttribute("aria-checked") === "true";
  toggle.setAttribute("aria-checked", String(!checked));
});

// Draggable 2x magnifier: clones #page-root into a small fixed-position
// lens, then translates/scales the clone so whatever sits under the lens
// on the real page appears there magnified. Clone (not a screenshot) so
// it stays crisp at any zoom and reflects the live fonts/colors.
(() => {
  const ZOOM = 1.5;
  const pageRoot = document.getElementById("page-root");
  const magnifierToggle = document.getElementById("magnifierToggle");
  const lens = document.getElementById("magnifierLens");
  const inner = document.getElementById("magnifierInner");
  const closeBtn = document.getElementById("magnifierClose");

  let active = false;
  let dragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  function lensSize() {
    return lens.getBoundingClientRect().width;
  }

  // cloneNode() only copies light DOM — open shadow roots (like the
  // embedded a11y-checker widget's) are silently skipped, leaving their
  // host collapsed to 0 height in the clone and throwing off every
  // section below it. Walk both trees in lockstep (querySelectorAll("*")
  // excludes shadow content on both sides, so indices stay aligned) and
  // reattach a cloned shadow root wherever the original has one.
  function cloneShadowRoots(realNode, cloneNode) {
    const realAll = realNode.querySelectorAll("*");
    const cloneAll = cloneNode.querySelectorAll("*");
    realAll.forEach((realEl, i) => {
      if (realEl.shadowRoot) {
        // ShadowRoot itself isn't a clonable node type, so clone each of
        // its children individually rather than the root.
        const shadow = cloneAll[i].attachShadow({ mode: "open" });
        realEl.shadowRoot.childNodes.forEach((child) => {
          shadow.append(child.cloneNode(true));
        });
        cloneShadowRoots(realEl.shadowRoot, shadow);
      }
    });
  }

  function buildClone() {
    inner.innerHTML = "";
    const clone = pageRoot.cloneNode(true);
    cloneShadowRoots(pageRoot, clone);
    clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    // Faking scroll with a transform never moves the clone's own scroll
    // container, so sticky elements inside it would stay glued to their
    // unstuck, natural-flow spot instead of tracking the real page's
    // scroll-dependent position. Pin them static so the clone at least
    // renders them where document flow puts them, rather than stale.
    clone.querySelectorAll(".site-header, .toc").forEach((el) => {
      el.style.position = "static";
    });
    clone.style.width = pageRoot.offsetWidth + "px";
    inner.appendChild(clone);
  }

  function clampLeft(left) {
    return Math.min(Math.max(left, 0), Math.max(window.innerWidth - lensSize(), 0));
  }

  function clampTop(top) {
    return Math.min(Math.max(top, 0), Math.max(window.innerHeight - lensSize(), 0));
  }

  function updateInnerTransform() {
    const left = parseFloat(lens.style.left) || 0;
    const top = parseFloat(lens.style.top) || 0;
    const r = lensSize() / 2;
    const tx = -r - ZOOM * left - ZOOM * window.scrollX;
    const ty = -r - ZOOM * top - ZOOM * window.scrollY;
    inner.style.transform = `translate(${tx}px, ${ty}px) scale(${ZOOM})`;
  }

  function moveLensTo(centerX, centerY) {
    const half = lensSize() / 2;
    lens.style.left = clampLeft(centerX - half) + "px";
    lens.style.top = clampTop(centerY - half) + "px";
    updateInnerTransform();
  }

  function setActive(next) {
    active = next;
    magnifierToggle.setAttribute("aria-pressed", String(active));
    if (active) {
      buildClone();
      lens.removeAttribute("hidden");
      moveLensTo(window.innerWidth / 2, window.innerHeight / 2);
    } else {
      lens.setAttribute("hidden", "");
    }
  }

  magnifierToggle.addEventListener("click", () => setActive(!active));

  // Close button lives inside the lens; stop the pointerdown from also
  // starting a drag on the lens behind it.
  closeBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setActive(false);
  });

  // Move/up listen on window (not the lens) so the drag keeps tracking
  // even if the pointer outruns the small lens box — no pointer capture
  // needed, which also sidesteps environments where capture on synthetic
  // input doesn't behave like it does for real hardware input.
  lens.addEventListener("pointerdown", (e) => {
    dragging = true;
    lens.classList.add("dragging");
    const rect = lens.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    e.preventDefault();
  });

  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    lens.style.left = clampLeft(e.clientX - dragOffsetX) + "px";
    lens.style.top = clampTop(e.clientY - dragOffsetY) + "px";
    updateInnerTransform();
  });

  window.addEventListener("pointerup", () => {
    dragging = false;
    lens.classList.remove("dragging");
  });

  window.addEventListener("scroll", () => active && updateInnerTransform(), { passive: true });
  window.addEventListener("resize", () => active && updateInnerTransform());
})();
