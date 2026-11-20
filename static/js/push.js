const VAPID_PUBLIC_KEY = 'BEsxN0YzeZrNBUefo8nbsOXfhg5QuEncLiNkiXDVu1lf-3wq-83ba0Xf-ze2iQ5yHXN365Yo8K5lnpxiAWl-J_8';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

async function isPushSupported() {
    return ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
}

async function getRegistration() {
    return await navigator.serviceWorker.register('/static/js/sw.js');
}

async function getExistingSubscription() {
    try {
        const reg = await navigator.serviceWorker.getRegistration('/static/js/sw.js');
        if (!reg) return null;
        return await reg.pushManager.getSubscription();
    } catch (e) { return null; }
}

async function enablePush() {
    if (!await isPushSupported()) {
        showToast('Ši naršyklė nepalaiko push pranešimų.', 'error');
        return false;
    }
    try {
        const reg = await getRegistration();
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            showToast('Nepavyko gauti leidimo pranešimams.', 'error');
            return false;
        }
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }
        const res = await fetch(`${API_URL}/api/push/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(sub)
        });
        if (res.ok) {
            showToast('Pranešimai įjungti!', 'success');
            await updatePushUI();
            return true;
        } else {
            const r = await res.json().catch(() => ({}));
            showToast(r.message || 'Nepavyko išsaugoti prenumeratos.', 'error');
            return false;
        }
    } catch (err) {
        console.error('Push klaida:', err);
        showToast('Klaida įjungiant pranešimus: ' + (err.message || ''), 'error');
        return false;
    }
}

async function disablePush() {
    try {
        const sub = await getExistingSubscription();
        if (sub) {
            await fetch(`${API_URL}/api/push/unsubscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ endpoint: sub.endpoint })
            });
            await sub.unsubscribe();
        }
        showToast('Pranešimai išjungti.', 'success');
        await updatePushUI();
    } catch (err) {
        console.error(err);
        showToast('Klaida išjungiant pranešimus.', 'error');
    }
}

async function sendTestPush() {
    try {
        const res = await fetch(`${API_URL}/api/push/test`, {
            method: 'POST',
            credentials: 'include'
        });
        const r = await res.json().catch(() => ({}));
        if (res.ok) {
            showToast(`Testinis pranešimas išsiųstas (${r.sent_to} įrenginiams)`, 'success');
        } else {
            showToast(r.message || 'Nepavyko išsiųsti.', 'error');
        }
    } catch (err) {
        showToast('Klaida siunčiant testą.', 'error');
    }
}

async function updatePushUI() {
    const statusEl = document.getElementById('pushStatus');
    const enableBtn = document.getElementById('enablePushBtn');
    const disableBtn = document.getElementById('disablePushBtn');
    const testBtn = document.getElementById('testPushBtn');
    if (!statusEl) return;

    if (!await isPushSupported()) {
        statusEl.className = 'push-status error';
        statusEl.textContent = 'Ši naršyklė nepalaiko push pranešimų.';
        if (enableBtn) enableBtn.classList.add('d-none');
        if (disableBtn) disableBtn.classList.add('d-none');
        if (testBtn) testBtn.classList.add('d-none');
        return;
    }

    const sub = await getExistingSubscription();
    const permission = Notification.permission;

    if (sub && permission === 'granted') {
        statusEl.className = 'push-status enabled';
        statusEl.textContent = '✅ Pranešimai įjungti. Gausite pranešimus į šį įrenginį.';
        if (enableBtn) enableBtn.classList.add('d-none');
        if (disableBtn) disableBtn.classList.remove('d-none');
        if (testBtn) testBtn.classList.remove('d-none');
    } else if (permission === 'denied') {
        statusEl.className = 'push-status error';
        statusEl.textContent = '⚠️ Pranešimai užblokuoti naršyklės nustatymuose. Leiskite juos per naršyklės nustatymus.';
        if (enableBtn) enableBtn.classList.add('d-none');
        if (disableBtn) disableBtn.classList.add('d-none');
        if (testBtn) testBtn.classList.add('d-none');
    } else {
        statusEl.className = 'push-status disabled';
        statusEl.textContent = 'Pranešimai neišjungti. Įjunkite, kad gautumėte pranešimus.';
        if (enableBtn) enableBtn.classList.remove('d-none');
        if (disableBtn) disableBtn.classList.add('d-none');
        if (testBtn) testBtn.classList.add('d-none');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const enableBtn = document.getElementById('enablePushBtn');
    const disableBtn = document.getElementById('disablePushBtn');
    const testBtn = document.getElementById('testPushBtn');

    if (enableBtn) enableBtn.addEventListener('click', async () => {
        enableBtn.disabled = true;
        enableBtn.textContent = 'Jungiama...';
        await enablePush();
        enableBtn.disabled = false;
        enableBtn.textContent = 'Įjungti pranešimus';
    });

    if (disableBtn) disableBtn.addEventListener('click', disablePush);
    if (testBtn) testBtn.addEventListener('click', sendTestPush);

    if (document.getElementById('pushStatus')) {
        updatePushUI();
    }
});