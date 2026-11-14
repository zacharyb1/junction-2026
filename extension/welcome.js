/* The welcome and settings page. Saying yes here is the one permission AIDaddy asks for. */

const PROFILE = ["givenName", "familyName", "email", "phone", "street", "postcode", "city", "birthDate"];
const CONNECTION = ["engine", "code", "country", "language"];
const DEFAULT_ENGINE = "https://86.38.238.136.sslip.io";
const $ = (id) => document.getElementById(id);

function showState(consent) {
  $("state").textContent = consent ? "AIDaddy is looking at the pages you open." : "AIDaddy is not looking. Nothing is read.";
  $("state").dataset.on = String(consent);
  $("allow").hidden = consent;
  $("stop").hidden = !consent;
}

async function load() {
  const stored = await chrome.storage.local.get(["consent", "profile", ...CONNECTION]);
  showState(Boolean(stored.consent));
  $("engine").value = stored.engine || DEFAULT_ENGINE;
  $("code").value = stored.code || "";
  $("country").value = stored.country || "FI";
  $("language").value = stored.language || "en";
  for (const key of PROFILE) $(key).value = stored.profile?.[key] ?? "";
}

async function save() {
  const profile = Object.fromEntries(PROFILE.map((key) => [key, $(key).value.trim()]));
  await chrome.storage.local.set({
    profile,
    engine: $("engine").value.trim() || DEFAULT_ENGINE,
    code: $("code").value.trim(),
    country: $("country").value,
    language: $("language").value,
  });
  $("saved").textContent = "Saved.";
  setTimeout(() => ($("saved").textContent = ""), 2000);
}

$("allow").addEventListener("click", async () => {
  await save();
  await chrome.storage.local.set({ consent: true, paused: false });
  showState(true);
});
$("stop").addEventListener("click", async () => {
  await chrome.storage.local.set({ consent: false });
  showState(false);
});
$("save").addEventListener("click", save);

load();
