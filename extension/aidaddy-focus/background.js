// AIDaddy Focus (issue #31): notice a half-done official task left for social media, and nudge once.
// Only hostnames are compared, state lives in this browser session, and nothing is sent anywhere.

const TASKS = [
  { host: /(^|\.)vero\.fi$/, name: "your tax return", site: "OmaVero" },
  { host: /(^|\.)kela\.fi$/, name: "your Kela application", site: "Kela" },
  { host: /(^|\.)migri\.fi$/, name: "your Migri application", site: "Migri" },
  { host: /(^|\.)suomi\.fi$/, name: "your Suomi.fi errand", site: "Suomi.fi" },
];
const DISTRACTIONS = /(^|\.)(facebook\.com|instagram\.com|tiktok\.com|x\.com|twitter\.com|reddit\.com|youtube\.com|netflix\.com)$/;

const LINGER_MINUTES = 1; // time on social media before the nudge
const SNOOZE_MINUTES = 30;
const FORGET_AFTER_MS = 2 * 60 * 60 * 1000; // a task left for two hours is no longer "in progress"

const hostOf = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};
const taskFor = (url) => TASKS.find((t) => t.host.test(hostOf(url)));
const state = () => chrome.storage.session.get({ task: null, snoozedUntil: 0 });

async function onActive(tab) {
  if (!tab?.url) return;
  const task = taskFor(tab.url);
  if (task) {
    // Working on an official task: remember the tab, and drop any pending nudge.
    await chrome.storage.session.set({ task: { tabId: tab.id, name: task.name, site: task.site, since: Date.now() } });
    await chrome.alarms.clear("nudge");
    return;
  }
  if (DISTRACTIONS.test(hostOf(tab.url))) {
    const { task: open, snoozedUntil } = await state();
    if (open && Date.now() - open.since < FORGET_AFTER_MS && Date.now() > snoozedUntil) {
      await chrome.alarms.create("nudge", { delayInMinutes: LINGER_MINUTES });
    }
    return;
  }
  await chrome.alarms.clear("nudge");
}

chrome.tabs.onActivated.addListener(({ tabId }) => chrome.tabs.get(tabId).then(onActive).catch(() => {}));
chrome.tabs.onUpdated.addListener((_id, change, tab) => {
  if (change.url && tab.active) onActive(tab);
});
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { task } = await state();
  if (task?.tabId === tabId) await chrome.storage.session.set({ task: null });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "nudge") return;
  const { task } = await state();
  if (!task) return;
  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!active || !DISTRACTIONS.test(hostOf(active.url))) return;
  const still = await chrome.tabs.get(task.tabId).catch(() => null);
  if (!still) return;
  chrome.notifications.create("aidaddy-nudge", {
    type: "basic",
    iconUrl: "icon-128.png",
    title: "AIDaddy",
    message: `${task.name[0].toUpperCase()}${task.name.slice(1)} is still open on ${task.site}. Back to it? A few more steps and it is done.`,
    buttons: [{ title: "Back to it" }, { title: `Later (${SNOOZE_MINUTES} min)` }],
    priority: 1,
  });
});

chrome.notifications.onButtonClicked.addListener(async (id, button) => {
  if (id !== "aidaddy-nudge") return;
  chrome.notifications.clear(id);
  const { task } = await state();
  if (button === 0 && task) {
    const tab = await chrome.tabs.update(task.tabId, { active: true }).catch(() => null);
    if (tab) chrome.windows.update(tab.windowId, { focused: true });
  } else {
    await chrome.storage.session.set({ snoozedUntil: Date.now() + SNOOZE_MINUTES * 60 * 1000 });
  }
});
