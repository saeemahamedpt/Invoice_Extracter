
// Azure Functions (Node.js v4 compatible)
const axios = require('axios');

module.exports = async function (context, req) {
  try {
    const { EmployeeID, RequestNumber, filename, fileBase64 } = req.body || {};

    if (!EmployeeID || !RequestNumber || !fileBase64) {
      context.res = {
        status: 400,
        jsonBody: { error: 'Missing required fields: EmployeeID, RequestNumber, fileBase64' }
      };
      return;
    }

    // Read configuration from environment (set in Azure Portal → Configuration → Application settings)
    const BASE_URL = process.env.TARGET_FUNCTION_URL; // e.g., https://<func-app>.azurewebsites.net/api/<function-name>
    const FUNCTION_KEY = process.env.FUNCTION_KEY;

    if (!BASE_URL || !FUNCTION_KEY) {
      context.res = {
        status: 500,
        jsonBody: { error: 'Server not configured: missing TARGET_FUNCTION_URL or FUNCTION_KEY' }
      };
      return;
    }

    // Build target URL and append ?code=<FUNCTION_KEY> safely
    // Handles cases where BASE_URL may already have query params
    const urlObj = new URL(BASE_URL);
    urlObj.searchParams.set('code', FUNCTION_KEY);
    const TARGET_URL_WITH_CODE = urlObj.toString();

    // Forward JSON to your external function (key passed via query string)
    const resp = await axios.post(
      TARGET_URL_WITH_CODE,
      {
        EmployeeID,
        RequestNumber,
        filename: filename || 'Default',
        fileBase64
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    context.res = {
      status: 200,
      jsonBody: resp.data
    };
  } catch (err) {
    const status = err?.response?.status || 502;
    const details = err?.response?.data || err.message;
    context.log.error('Upstream call failed:', details);

    context.res = {
      status,
      jsonBody: { error: 'Upstream API call failed', details }
    };
  }
};
