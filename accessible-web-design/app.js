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
