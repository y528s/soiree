/**
 * Soiree RSVP backend — Google Apps Script.
 *
 * Setup:
 *   1. Create a new Google Sheet. First row headers (cols A–F):
 *      Timestamp | Name | Email | Phone | Count | Bringing
 *   2. Extensions → Apps Script. Replace the default Code.gs with this file.
 *   3. Deploy → New deployment → type "Web app".
 *      Execute as: Me.   Who has access: Anyone.
 *   4. Copy the /exec URL and paste into script.js as WEB_APP_URL.
 *
 * The Sheet itself is the admin view — Yosef sees all columns including
 * email and phone. The public GET endpoint never returns those columns.
 */

function doPost(e) {
  try {
    const p = e.parameter || {};

    // Honeypot — bots fill every visible field, so any value here = spam.
    if (p.website) return jsonOut({ ok: true });

    const name = (p.name || '').toString().trim();
    const email = (p.email || '').toString().trim();
    const phone = (p.phone || '').toString().trim();
    const count = parseInt(p.count, 10);
    const bringing = (p.bringing || '').toString().trim();

    if (!name) return jsonOut({ ok: false, error: 'Name is required.' }, 400);
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return jsonOut({ ok: false, error: 'Valid email is required.' }, 400);
    }
    if (!phone) return jsonOut({ ok: false, error: 'Phone is required.' }, 400);
    if (!count || count < 1 || count > 8) {
      return jsonOut({ ok: false, error: 'Count must be 1–8.' }, 400);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    sheet.appendRow([new Date(), name, email, phone, count, bringing]);

    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) }, 500);
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.list !== '1') {
    return jsonOut({ ok: true, msg: 'RSVP endpoint live.' });
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const last = sheet.getLastRow();
  if (last < 2) return jsonOut([]);

  // Columns: A=Timestamp, B=Name, C=Email, D=Phone, E=Count, F=Bringing.
  // Read ONLY name (B), count (E), bringing (F). Email + phone stay private.
  const names = sheet.getRange(2, 2, last - 1, 1).getValues();
  const counts = sheet.getRange(2, 5, last - 1, 1).getValues();
  const bringings = sheet.getRange(2, 6, last - 1, 1).getValues();

  const rows = [];
  for (let i = 0; i < names.length; i++) {
    const name = (names[i][0] || '').toString().trim();
    if (!name) continue;
    rows.push({
      name: name,
      count: parseInt(counts[i][0], 10) || 1,
      bringing: (bringings[i][0] || '').toString().trim(),
    });
  }
  return jsonOut(rows);
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
