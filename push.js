'use strict';

const VAPID_PUBLIC_KEY = "BDt6dV5uL5twBnn2xHG_wLSooSRYpxYMeKPEOSmQJZSGCV1hOWXNY9sZEx12ThNJbb1GhA9k9nKENswR0hUzYoQ";

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

function validateVapidKey(key) {
    if (typeof key !== 'string') throw new Error('VAPID raktas turi būti eilutė');
    if (/BEGIN|END/.test(key)) throw new Error('VAPID raktas neturi turėti BEGIN/END');
    if (/\s/.test(key)) throw new Error('VAPID rakte neturi būti tarpų');
    const arr = urlBase64ToUint8Array(key);
    if (arr.length !== 65) throw new Error(`VAPID raktas turi būti 65 baitų, gauta ${arr.length}`);
    if (arr[0] !== 4) throw new Error(`Pirmas baitas turi būti 4, gauta ${arr[0]}`);
    return arr;
}

function subscriptionUsesSameKey(sub, expectedKey) {
    if (!sub?.options?.applicationServerKey) return false;
    const current = new Uint8Array(sub.options.applicationServerKey);
    const expected = urlBase64ToUint8Array(expectedKey);
    if (current.length !== expected.length) return false;
    for (let i = 0; i < current.length; i++) if (current[i] !== expected[i]) return false;
    return true;
}

async function isPushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function getRegistration() {
    const existing = await navigator.serviceWorker.getRegistration('sw.js');
    if (existing) return existing;
    return navigator.serviceWorker.register('sw.js');
}

async function getExistingSubscription() {
    try {
        const reg = await navigator.serviceWorker.getRegistration('sw.js');
        return reg ? await reg.pushManager.getSubscription() : null;
    } catch {
        return null;
    }
}

async function ensureFreshSubscription(reg) {
    let sub = await reg.pushManager.getSubscription();
    if (sub && !subscriptionUsesSameKey(sub, VAPID_PUBLIC_KEY)) {
        await sub.unsubscribe();
        return null;
    }
    return sub;
}

async function enablePush() {
    if (!(await isPushSupported())) {
        showToast('Ši naršyklė nepalaiko push pranešimų.', 'error');
        return false;
    }

    try {
        const keyArr = validateVapidKey(VAPID_PUBLIC_KEY);
        const reg = await getRegistration();
        if (await Notification.requestPermission() !== 'granted') {
            showToast('Nepavyko gauti leidimo pranešimams.', 'error');
            return false;
        }

        let sub = await ensureFreshSubscription(reg);
        if (!sub) {
            sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyArr });
        }

        const res = await fetch(`${API_URL}/push/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
        });
        if (!res.ok) {
            const r = await res.json().catch(() => ({}));
            showToast(r.message || 'Nepavyko išsaugoti prenumeratos.', 'error');
            return false;
        }
        showToast('Pranešimai įjungti!', 'success');
        await updatePushUI();
        return true;
    } catch (err) {
        console.error('Push klaida:', err);
        showToast('Klaida įjungiant pranešimus: ' + err.message, 'error');
        return false;
    }
}

async function disablePush() {
    try {
        const sub = await getExistingSubscription();
        if (!sub) {
            showToast('Pranešimai nebuvo įjungti.', 'error');
            return;
        }
        await fetch(`${API_URL}/push/unsubscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
        showToast('Pranešimai išjungti.', 'success');
        await updatePushUI();
    } catch (err) {
        console.error(err);
        showToast('Klaida išjungiant pranešimus.', 'error');
    }
}

async function sendTestPush() {
    try {
        const res = await fetch(`${API_URL}/push/test`, { method: 'POST' });
        const r = await res.json().catch(() => ({}));
        if (!res.ok) {
            showToast(r.message || 'Nepavyko išsiųsti.', 'error');
            return;
        }
        if (r.errors?.length) {
            showToast(`Išsiųsta: ${r.sent_to}, klaidų: ${r.errors.length}`, 'error');
            console.error('[Push] Serverio klaidos:', r.errors);
        } else {
            showToast(`Testinis pranešimas išsiųstas (${r.sent_to})`, 'success');
        }
    } catch {
        showToast('Klaida siunčiant testą.', 'error');
    }
}

async function updatePushUI() {
    const statusEl = document.getElementById('pushStatus');
    if (!statusEl) return;

    const enableBtn = document.getElementById('enablePushBtn');
    const disableBtn = document.getElementById('disablePushBtn');
    const testBtn = document.getElementById('testPushBtn');
    const hide = (...els) => els.forEach(e => e?.classList.add('d-none'));
    const show = (...els) => els.forEach(e => e?.classList.remove('d-none'));

    if (!(await isPushSupported())) {
        statusEl.className = 'push-status error';
        statusEl.textContent = 'Ši naršyklė nepalaiko push pranešimų.';
        hide(enableBtn, disableBtn, testBtn);
        return;
    }

    const sub = await getExistingSubscription();
    const perm = Notification.permission;

    if (sub && perm === 'granted') {
        statusEl.className = 'push-status enabled';
        statusEl.textContent = '✅ Pranešimai įjungti. Gausite pranešimus į šį įrenginį.';
        hide(enableBtn);
        show(disableBtn, testBtn);
    } else if (perm === 'denied') {
        statusEl.className = 'push-status error';
        statusEl.textContent = '⚠️ Pranešimai užblokuoti naršyklės nustatymuose.';
        hide(enableBtn, disableBtn, testBtn);
    } else {
        statusEl.className = 'push-status disabled';
        statusEl.textContent = 'Pranešimai neįjungti. Įjunkite, kad gautumėte pranešimus.';
        show(enableBtn);
        hide(disableBtn, testBtn);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const enableBtn = document.getElementById('enablePushBtn');
    const disableBtn = document.getElementById('disablePushBtn');
    const testBtn = document.getElementById('testPushBtn');

    enableBtn?.addEventListener('click', async () => {
        enableBtn.disabled = true;
        enableBtn.textContent = 'Jungiama...';
        await enablePush();
        enableBtn.disabled = false;
        enableBtn.textContent = 'Įjungti pranešimus';
    });
    disableBtn?.addEventListener('click', disablePush);
    testBtn?.addEventListener('click', sendTestPush);

    if (document.getElementById('pushStatus')) updatePushUI();
});