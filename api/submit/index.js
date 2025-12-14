
// Azure Functions (Node.js v4 compatible)
const axios = require('axios');

module.exports = async function (context, req) {
  try {
    const { EmployeeID, RequestNumber, filename, fileBase64 } = req.body || {};

    if (!EmployeeID || !RequestNumber || !fileBase64) {
      return context.res = {
        status: 400,
        jsonBody: { error: 'Missing required fields: EmployeeID, RequestNumber, fileBase64' }
      };
    }

    // Read secrets from environment (configured in Azure Portal)
    const TARGET_FUNCTION_URL = process.env.TARGET_FUNCTION_URL; // e.g., https://<func-app-url>/api/<function-name>
    const FUNCTION_KEY = process.env.FUNCTION_KEY;               // function-level key

    if (!TARGET_FUNCTION_URL || !FUNCTION_KEY) {
      return context.res = {
        status: 500,
        jsonBody: { error: 'Server not configured: missing TARGET_FUNCTION_URL or FUNCTION_KEY' }
      };
    }

    // Forward JSON to your external function
    // Use x-functions-key header instead of ?code= in query string
    // https://learn.microsoft.com/... function keys; and header alternative documented
    const resp = await axios.post(TARGET_FUNCTION_URL, {
      EmployeeID,
      RequestNumber,
      filename: filename || 'Default',
      fileBase64
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-functions-key': FUNCTION_KEY
      },
      timeout: 30000
    });

    return context.res = {
      status: 200,
      jsonBody: resp.data
    };

  } catch (err) {
    const status = err?.response?.status || 502;
    const details = err?.response?.data || err.message;
    context.log.error('Upstream call failed:', details);
    return context.res = {
      status,
      jsonBody: { error: 'Upstream API call failed', details }
    };
  }
};
