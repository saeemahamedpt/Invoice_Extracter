
// Azure Functions (Node.js v4 compatible)
const axios = require('axios');

module.exports = async function (context, req) {
  try {
    const { EmployeeID, RequestNumber, filename, fileBase64 } = req.body || {};

    if (!EmployeeID || !RequestNumber || !fileBase64) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Missing required fields: EmployeeID, RequestNumber, fileBase64' }
      };
      return;
    }

    const BASE_URL = process.env.TARGET_FUNCTION_URL; // https://<func-app>/api/<function-name>
    const FUNCTION_KEY = process.env.FUNCTION_KEY;

    if (!BASE_URL || !FUNCTION_KEY) {
      context.res = {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Server not configured: missing TARGET_FUNCTION_URL or FUNCTION_KEY' }
      };
      return;
    }

    const urlObj = new URL(BASE_URL);
    urlObj.searchParams.set('code', FUNCTION_KEY);
    const TARGET_URL_WITH_CODE = urlObj.toString();

    context.log('[submit] Calling upstream:', TARGET_URL_WITH_CODE);

    const resp = await axios.post(
      TARGET_URL_WITH_CODE,
      {
        EmployeeID,
        RequestNumber,
        filename: filename || 'Default',
        fileBase64
      },
      {
        // If upstream sends text/plain, we still capture it
        validateStatus: () => true, // don't throw for non-2xx; we handle below
        timeout: 30000
      }
    );

    const ct = resp.headers['content-type'] || '';
    const status = resp.status;

    context.log('[submit] Upstream status:', status);
    context.log('[submit] Upstream content-type:', ct);

    // Normalize response into JSON
    let normalized;
    if (ct.includes('application/json')) {
      normalized = resp.data ?? {};
    } else {
      const rawText = typeof resp.data === 'string' ? resp.data : '';
      normalized = {
        note: 'Upstream returned non-JSON content. Showing raw.',
        raw: rawText
      };
    }

    // If upstream gave empty body (e.g., 204), add a helpful message
    if ((status === 204) || (normalized && Object.keys(normalized).length === 0)) {
      normalized = {
        note: 'Upstream returned no content (possibly HTTP 204).',
        raw: ''
      };
    }

    context.res = {
      status: status >= 200 && status < 300 ? 200 : status, // surface upstream error code
      headers: { 'Content-Type': 'application/json' },
      body: normalized
    };
  } catch (err) {
    const status = err?.response?.status || 502;
    const details = err?.response?.data || err.message;
    context.log.error('[submit] Upstream call failed:', details);

    context.res = {
      status,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'Upstream API call failed', details }
    };
  }
};

