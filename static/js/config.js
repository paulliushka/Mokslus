/* ==========================================================================
   KONFIGŪRACIJA IR GLOBALUS FETCH WRAPPER
   - Automatinis API_URL pagal aplinką (localhost vs production)
   - Automatinis credentials: 'include' (jei nenurodyta kitaip)
   - Saugus headers normalizavimas (Headers, array, plain object)
   - Apsauga nuo dvigubo wrap'inimo
   ========================================================================== */

(function () {
    'use strict';

    // ----------------------------------------------------------------------
    // 1. API_URL nustatymas pagal aplinką
    // ----------------------------------------------------------------------
    const PRODUCTION_API = 'https://api.pranskaitis.lt';
    const LOCAL_API = 'http://localhost:5000';

    const isLocalhost = (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '0.0.0.0' ||
        window.location.protocol === 'file:'
    );

    // Leidžiame perrašyti per `window.MOKSLUS_API_URL` (jei reikia)
    const API_URL = window.MOKSLUS_API_URL || (isLocalhost ? LOCAL_API : PRODUCTION_API);

    // Eksportuojame globaliai
    window.API_URL = API_URL;

    // ----------------------------------------------------------------------
    // 2. Pagalbinės funkcijos
    // ----------------------------------------------------------------------
    /**
     * Normalizuoja headers į Headers objektą.
     * Priima: Headers, Array, plain Object, undefined.
     */
    function normalizeHeaders(headers) {
        if (headers instanceof Headers) {
            return new Headers(headers);
        }
        if (Array.isArray(headers)) {
            return new Headers(headers);
        }
        if (headers && typeof headers === 'object') {
            return new Headers(headers);
        }
        return new Headers();
    }

    // ----------------------------------------------------------------------
    // 3. Fetch wrapper
    // ----------------------------------------------------------------------
    // Apsauga nuo dvigubo wrap'inimo
    if (window.__mokslusFetchWrapped) {
        return;
    }
    window.__mokslusFetchWrapped = true;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async function (resource, options = {}) {
        let opts = options || {};
        if (opts instanceof Request) {
            opts = {
                method: opts.method,
                headers: opts.headers,
                body: opts.body,
                mode: opts.mode,
                credentials: opts.credentials,
                cache: opts.cache,
                redirect: opts.redirect,
                referrer: opts.referrer,
                referrerPolicy: opts.referrerPolicy,
                integrity: opts.integrity,
                keepalive: opts.keepalive,
                signal: opts.signal
            };
        }

        // Credentials pagal nutylėjimą - 'include' (kad slapukai veiktų tarp domenų)
        if (opts.credentials === undefined) {
            opts.credentials = 'include';
        }

        if (opts.headers !== undefined) {
            opts.headers = normalizeHeaders(opts.headers);
        }

        return originalFetch(resource, opts);
    };

    // ----------------------------------------------------------------------
    // 4. Pagalbinės globalios funkcijos (patogumui)
    // ----------------------------------------------------------------------
    /**
     * Sutrumpintas fetch su JSON apdorojimu.
     * Grąžina { ok, status, data } - niekada nemeta klaidos.
     */
    window.apiFetch = async function (path, options = {}) {
        const url = /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`;

        try {
            const response = await window.fetch(url, options);
            let data = null;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                try {
                    data = await response.json();
                } catch (e) {
                    data = null;
                }
            }
            return { ok: response.ok, status: response.status, data, response };
        } catch (error) {
            return { ok: false, status: 0, data: null, error };
        }
    };

    /**
     * Redirect į login, jei 401.
     */
    window.requireAuth = async function () {
        const result = await window.apiFetch('/api/profile');
        if (!result.ok || result.status === 401) {
            window.location.replace('/');
            return null;
        }
        return result.data;
    };
})();