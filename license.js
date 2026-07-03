/**
 * license.js — Trial and license key management for Director's Prep
 * Uses Lemon Squeezy API to validate license keys.
 */

const fs   = require('fs');
const path = require('path');
const { app } = require('electron');

// ── Config ────────────────────────────────────────────────────────────────────
const LS_API_KEY    = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiJmY2FhMWQ1OTQ2MjMwYzE5MDM2ZDNiYTAwMWMzODZlZDlkYTEzYWIxYWYyNDUxNDQ5NjRjOTM0ZmNlOWNmMzZhZTQ2YTM3MWMwYmE5YzBjYiIsImlhdCI6MTc4MzExMjE1NC4wOTcyNzUsIm5iZiI6MTc4MzExMjE1NC4wOTcyNzgsImV4cCI6MTc5ODkzNDQwMC4wMzYyNTgsInN1YiI6IjY3ODU1MDMiLCJzY29wZXMiOltdfQ.07AqAm9GwPACX-VekbM32VBnDp111mn2VuS7H-c2tfHqeunwRJfBpZaUIqLVDrU2CK3gW0rdLTL1yWBPVVGMlHVZ2u8BuoXJAwqJQ2-z9DLpvuE8i90AMxCzjup-mFENXjtt6HdC9tK33nUdOdr-fPkN0-ux_ZH6a_ZXeFBW7eVKgY0uqIUUk4neEnMsvum38ekPcWaeaKVrgY1r0KnzzUkBYU1XMelQDzhbrb243BbEdVljwUWuPRSBWnHXbBU69MmRE7FSuLgTvVaiRCs6Qze3Ie_SCGJ2x1J5PaFpEGMlovLh-e4qYHrI9xHPr5acdU6zg5CZ42ETTp8aml8MBz8zlXxjiNXANNtQhxfD3q-fS9MVlY5iq-mz2I2zYaDmCu02r711IbPHJVSrmlVhRVzAoId1rqSgJx6a7vbrjDFWLKCA8u5l3D_nKHE-lk3bH83xeppyf_o9xe2FvxVYwurdy6fMQ_YxsVoNfBTdX5HQqBoFRd_52_ZJnKrgZv0MsXi8eFdYdOpYD08lZyAt-j1FcWYWOk_HiExo6i_ESHGusOq6jDOcrEh9xuu4TevDDkc837pbqWPrnLndoP_J55tHY_HTMGWo5j1_fSHwshVx2n65eixh4_cD_difSR5ctak76D3AjobaeGsx39U9oAK4Y6ZOTrTcbUjnhDiINe8';   // Lemon Squeezy live API key
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
