/* The toolbar popup: is UKK looking, pause everywhere, pause on this site. */

const $ = (id) => document.getElementById(id);

async function currentHost() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    return new URL(tab?.url ?? "").hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function draw() {
  const { consent = false, paused = false, pausedHosts = [] } = await chrome.storage.local.get(["consent", "paused", "pausedHosts"]);
  const host = await currentHost();
  const siteOff = pausedHosts.includes(host);

  if (!consent) {
    $("state").textContent = "UKK is not looking. You have not said yes yet.";
    $("toggle").textContent = "Set it up";
    $("toggle").onclick = () => chrome.runtime.openOptionsPage();
    $("site").hidden = true;
    return;
  }
  $("state").textContent = paused ? "Paused everywhere." : siteOff ? `Not looking at ${host}.` : "Looking at the pages you open.";
  $("state").dataset.on = String(!paused && !siteOff);
  $("toggle").textContent = paused ? "Start looking again" : "Pause everywhere";
  $("toggle").onclick = async () => {
    await chrome.storage.local.set({ paused: !paused });
    draw();
  };
  $("site").hidden = !host;
  $("site").textContent = siteOff ? `Look at ${host} again` : `Do not look at ${host}`;
  $("site").onclick = async () => {
    const next = siteOff ? pausedHosts.filter((item) => item !== host) : [...pausedHosts, host];
    await chrome.storage.local.set({ pausedHosts: next });
    draw();
  };
}

$("settings").onclick = () => chrome.runtime.openOptionsPage();
draw();
