/**
 * license.js — Trial and license key management for Director's Prep
 * Uses Lemon Squeezy API to validate license keys.
 */

const fs   = require('fs');
const path = require('path');
const { app } = require('electron');

// ── Config ────────────────────────────────────────────────────────────────────
const LS_API_KEY    = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiJmZGJkN2EyZTQwYTRjMWFkZmZiOTc5MzA1NjljMzA4NjNjNDAwODdmMWQ5MTBiNDI2NzgzNTAzMjA3NTg2NjQyYmViODA4N2U5NzIxOWFkMiIsImlhdCI6MTc4MDkyNzY3Ni41OTA5NTIsIm5iZiI6MTc4MDkyNzY3Ni41OTA5NTQsImV4cCI6MTc5NjY4ODAwMC4wMjcxMTksInN1YiI6IjY3ODU1MDMiLCJzY29wZXMiOltdfQ.DYKbSSilWzMNHOJ_lMXWvMrrBcR_ysR0IEYM_Om02yVBQr8JJKEpwuNC20B7Padl2HZCZ0ViSMcyv0Y30ZjyYDNySYsJtcAudCL_z0sB0EAkGUn2M1xUlpfTmLdDTdVoRwQKP5b2c4YeHEref-5FUOwbGPFIW-KJ5MsV7A_0jSEGjG8DXbxYEHwGPD1yy2vFd7889UEyXHGB4w2KoIhnRD7CTp2AMO3h9t3GanIjBHWLVTj-WtJ2Uggy03t0QEHlxtnF1ymwLXSZPGOzDRUuG4NyOXMQd9AdSBJAi2Orx7QZ7Y2vnO5-HdsqzzLyfAcOoHB1s-AXk7hCVYn7-UGsDw0PEVOuABzLbQ1IgTzj0j-mTlaGXuZCcAJ-2udDrCn9V6jihMosSVd1vgrRVaKaXvwFIyETXf7Ij-_nesGu1EG1PLObQ5Ph1PvyraTB8ar_FHpg0JgZfbgBQvMZzi2chFHXnR7feKYT17wzxVLiEHU6EA1HKVFo1WvAsCLTi7TGdxuOuKEfpfvuybyIe2K4aVC4wLXTCbTDMrEfgGNln0XKsJNs7RK_JM4fsBZofdhoZ097X6b6e8mp7t2QGTqiY-D5uDZiQS7-y6sg6_vHOM3EQ6rsVZL-dQ3qj0y-Zz9pC_DwHSiExDC4LnIGN1O0IgMRja_5Y9fhDGUZLXFMhSs';   // paste your Lemon Squeezy API key
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
