/**
 * license.js — Trial and license key management for Director's Prep
 * Uses Lemon Squeezy API to validate license keys.
 */

const fs   = require('fs');
const path = require('path');
const { app } = require('electron');

// ── Config ────────────────────────────────────────────────────────────────────
const LS_API_KEY    = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiIzODk2YWVlZGIyMDIxYjc0NWQyOWY1ZjNhZGRhZWY5MDA5M2JjNzE5Y2JjNTkxMzIyMjBiYjRlNmNjMWFiMTYwODJkMzJjYzE5MzU0MWVjMCIsImlhdCI6MTc4MzExMTU5Ni4zMzg5MDIsIm5iZiI6MTc4MzExMTU5Ni4zMzg5MDQsImV4cCI6MTc5ODkzNDQwMC4wMzQ2MDMsInN1YiI6IjY3ODU1MDMiLCJzY29wZXMiOltdfQ.nB2OjW8T9rjr8E1Db6fph8EQdfy7idwdJqOEU1OvSZLkWMvfqlukRy6kmiphV-HYA35a3A65mb_W79bpIVYIpw5PO_E7Rkj4l9pfoiPe-hzVLN6Ee1gEPxNWuT7_iH3te2AeiARDXdo9iu4O5jKNjDbe3MluWrlZgYjZa_YjtjxgpR9kWrmmNlH6CsNq0EJBoIVadOiR4UsrROjJ9BKToFXE9VdDurVcEQokOcZVX6X_z0Mca7BbsJWs4GVJDlolA-twHeun5v2ENZJmLcjUPyaPc4p_IB8DGRdt9aSXJ5AKHRX1bhdQB9ND6kzEOGNJlTHp_XXf9nqhR4tRzSaBbsKmtIreB4PBGjUOdHkqzfjTUNQgmshEfaWm-eyxILjgSPX2IdEvvUBfFb-zs5odkfiT3zpdY_F8u7shD6KesdwTGXeynkLTsT0cw8wN3qsoBwMkrkGn5JxFdq5v5H1XfE79FQxoB3SHGHCjN8t23FXs8_DSIEWEByrM1oY1X1Obq9Po3jn29ASNy2t6zV7c0Gpkb-yTLJ0AwPxzwh0ldk_-bKVHHGptujjmKrfdFL5hx_8PUAkUIHufXptc0jnP1vMp07D_OJSDYp6OCwsoZL2MtJ65l5YMjCS-fX3ofboiYZD-O5qQpFmiPUD4D9u1SrjGhvjT99dXdnEjSK4f9L0';   // Lemon Squeezy live API key
const LS_PRODUCT_ID = 1126655;
const TRIAL_DAYS    = 14;

// ── Storage ───────────────────────────────────────────────────────────────────
const DATA_PATH = path.join(app.getPath('userData'), 'license.json');

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); } catch { return {}; }
}

function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data), 'utf8');
}

// ── Trial ─────────────────────────────────────────────────────────────────────

function getTrialInfo() {
  const data = loadData();

  // First launch — record start date
  if (!data.trialStart) {
    data.trialStart = Date.now();
    saveData(data);
  }

  const elapsed  = Date.now() - data.trialStart;
  const daysUsed = Math.floor(elapsed / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(0, TRIAL_DAYS - daysUsed);

  return { daysLeft, expired: daysLeft === 0 };
}

// ── License validation ────────────────────────────────────────────────────────

async function validateKey(licenseKey) {
  try {
    const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: {
        'Accept':        'application/json',
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${LS_API_KEY}`,
      },
      body: JSON.stringify({
        license_key:    licenseKey,
        instance_name:  require('os').hostname(),
      }),
    });

    const json = await res.json();

    if (!json.valid) {
      return { ok: false, error: json.error || 'Invalid license key.' };
    }

    // Check it belongs to our product
    if (json.meta?.product_id !== LS_PRODUCT_ID) {
      return { ok: false, error: 'This key is not for Director\'s Prep.' };
    }

    return { ok: true, instance_id: json.instance?.id };
  } catch (err) {
    return { ok: false, error: 'Could not reach the license server. Check your internet connection.' };
  }
}

// ── Activate ──────────────────────────────────────────────────────────────────

async function activateKey(licenseKey) {
  const result = await validateKey(licenseKey);
  if (!result.ok) return result;

  const data = loadData();
  data.licenseKey  = licenseKey;
  data.instanceId  = result.instance_id;
  data.activatedAt = Date.now();
  saveData(data);

  return { ok: true };
}

// ── Status ────────────────────────────────────────────────────────────────────

function getLicenseStatus() {
  // Skip licensing entirely in development
  if (!app.isPackaged) {
    return { licensed: true, dev: true };
  }

  const data = loadData();

  if (data.licenseKey) {
    return { licensed: true, key: data.licenseKey };
  }

  const trial = getTrialInfo();
  return { licensed: false, ...trial };
}

module.exports = { getLicenseStatus, activateKey };
