
<script>
  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // result is "data:<mime>;base64,<data>" – we only need the actual Base64
        const [, base64] = reader.result.split(',');
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  document.getElementById('requestForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const employeeId = document.getElementById('employeeId').value.trim();
    const requestNumber = document.getElementById('requestNumber').value.trim();
    const fileInput = document.getElementById('attachment');
    const responseEl = document.getElementById('status'); // or create a <pre id="status"></pre>

    if (!employeeId || !requestNumber || !fileInput.files.length) {
      responseEl.textContent = 'Please fill all fields and attach a file.';
      responseEl.className = 'error';
      return;
    }

    const file = fileInput.files[0];
    // optional: enforce max size (e.g., 5 MB to avoid huge Base64 payloads)
    if (file.size > 5 * 1024 * 1024) {
      responseEl.textContent = 'File too large (max 5 MB).';
      responseEl.className = 'error';
      return;
    }

    const fileBase64 = await fileToBase64(file);

    const payload = {
      EmployeeID: employeeId,
      RequestNumber: requestNumber,
      filename: 'Default',
      fileBase64: fileBase64
    };

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      responseEl.className = res.ok ? 'success' : 'error';
      responseEl.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      responseEl.className = 'error';
      responseEl.textContent = `Network error: ${err.message}`;
    }
  });
</script>
