'use strict';

(function () {
    if (window.__mokslusConfigLoaded) return;
    window.__mokslusConfigLoaded = true;

    const isLocal =
        ['localhost', '127.0.0.1', '0.0.0.0'].includes(location.hostname) ||
        location.protocol === 'file:';

    window.API_URL = window.MOKSLUS_API_URL
        || (isLocal ? 'http://localhost:5000' : 'https://api.pranskaitis.lt');

    if (window.__mokslusFetchWrapped) return;
    window.__mokslusFetchWrapped = true;

    const originalFetch = window.fetch.bind(window);

    function normalizeHeaders(h) {
        try {
            return new Headers(h || {});
        } catch {
            return new Headers();
        }
    }

    window.fetch = function (resource, options = {}) {
        const opts = { ...options };
        if (opts.credentials === undefined) opts.credentials = 'include';
        if (opts.headers !== undefined) opts.headers = normalizeHeaders(opts.headers);
        return originalFetch(resource, opts);
    };

    window.apiFetch = async function (path, options = {}) {
        const url = /^https?:\/\//i.test(path) ? path : `${window.API_URL}${path}`;
        try {
            const response = await window.fetch(url, options);
            const ct = response.headers.get('content-type') || '';
            let data = null;
            if (ct.includes('application/json')) {
                try { data = await response.json(); } catch {}
            }
            return { ok: response.ok, status: response.status, data, response };
        } catch (error) {
            return { ok: false, status: 0, data: null, error };
        }
    };

    window.requireAuth = async function () {
        const r = await window.apiFetch('/api/profile');
        if (!r.ok || r.status === 401) {
            location.replace('/');
            return null;
        }
        return r.data;
    };
})();