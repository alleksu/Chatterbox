const REQUEST_TIMEOUT_MS = 10000;

// Keep the browser's auth requests and validation testable without the chat UI.
export function createAuthClient(fetchRequest = globalThis.fetch.bind(globalThis)) {
  async function request(route, body) {
    let response;
    try {
      response = await fetchRequest(route, {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        ...(body === undefined ? {} : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      });
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error('Chatterbox took too long to respond. Please try again.');
      }
      throw new Error('Cannot connect to Chatterbox. Check that the server is running and open its printed address.');
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw Object.assign(new Error(data?.error || `Chatterbox returned an error (${response.status}).`), { status: response.status });
    }
    if (!data || !Object.hasOwn(data, 'user') ||
        (data.user !== null && (!data.user.id || !data.csrfToken))) {
      throw new Error('Unexpected sign-in response. Refresh Chatterbox and try again.');
    }
    return data;
  }

  return {
    session: () => request('/api/auth/session'),
    async submit(mode, fields) {
      if (!['register', 'login'].includes(mode)) throw new Error('Choose Create account or Log in.');
      const username = String(fields.username || '').trim().toLowerCase();
      const password = fields.password;
      if (!/^[a-z0-9_.]{3,24}$/.test(username)) {
        throw new Error('Username must be 3–24 letters, numbers, dots or underscores.');
      }
      if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
        throw new Error('Password must have 8–128 characters.');
      }
      const body = { username, password };
      if (mode === 'register') {
        body.name = String(fields.name || '').trim().replace(/\s+/g, ' ');
        if (body.name.length < 2 || body.name.length > 24 || /[<>\x00-\x1f\x7f]/.test(body.name)) {
          throw new Error('Name must contain 2–24 valid characters.');
        }
      }
      const result = await request(`/api/auth/${mode}`, body);
      if (!result.user) throw new Error('Sign-in did not complete. Please try again.');
      return result;
    },
  };
}
