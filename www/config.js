window.__APP_CONFIG__ = {
  mode: 'free-online',
  localFallback: true,
  supabaseUrl: 'https://flsmlseudnlnogcuhtns.supabase.co',
  supabaseAnonKey: 'sb_publishable_ismeyoGkPY954pio11PuqA_IizE0WvJ',
  apiBase: 'https://YOUR-BACKEND-URL.example.com'
};

window.__APP_API_BASE__ = (() => {
  const origin = window.location.origin || 'http://localhost:8000';
  const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
  return isLocal ? origin : window.__APP_CONFIG__.apiBase;
})();
