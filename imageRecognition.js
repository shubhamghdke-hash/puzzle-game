const SKIP_VERIFICATION = new Set(['cute']);

const SUBJECT_PROMPTS = {
  dog: 'a dog',
  cat: 'a cat',
  flower: 'a flower or flowers',
  dish: 'food or a dish / meal',
};

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * @param {File} file
 * @param {string} subject
 * @param {{ enabled?: boolean, apiUrl?: string, strict?: boolean }} config
 */
export async function verifyImage(file, subject, config = {}) {
  if (SKIP_VERIFICATION.has(subject)) {
    return { ok: true, skipped: true };
  }

  if (!config.enabled) {
    return { ok: true, skipped: true };
  }

  const apiUrl = config.apiUrl || '/api/verify-image';
  const strict = config.strict !== false;

  try {
    const image = await fileToBase64(file);
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        mimeType: file.type || 'image/jpeg',
        image,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false,
        message: data.message || "That doesn't look right — try another photo?",
      };
    }

    return {
      ok: Boolean(data.ok),
      message: data.message || '',
      description: data.description || '',
      skipped: Boolean(data.skipped),
    };
  } catch (err) {
    console.error('Image verification failed:', err);

    if (!strict) {
      return { ok: true, skipped: true, error: err.message };
    }

    return {
      ok: false,
      message: "Couldn't verify the photo right now — try again in a moment.",
      error: err.message,
    };
  }
}

export { SUBJECT_PROMPTS };
