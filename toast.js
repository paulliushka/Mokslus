/* ==========================================================================
   UNIVERSALUS TOAST PRANEŠIMŲ MODULIS
   - Saugus tekstas (textContent, ne innerHTML)
   - Maksimalus toast'ų skaičius (MAX_TOASTS)
   - Tipo validacija su fallback į 'info'
   - Prieinamumas (role="status", aria-live)
   ========================================================================== */

const TOAST_TYPES = ['error', 'success', 'info'];
const MAX_TOASTS = 5;
const DEFAULT_DURATION = 4000;

function ensureToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.setAttribute('role', 'status');
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'false');
        document.body.appendChild(container);
    }
    return container;
}

function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

function showToast(message, type = 'error', duration = DEFAULT_DURATION) {
    // Validuojame tipą
    if (!TOAST_TYPES.includes(type)) {
        type = 'info';
    }

    // Validuojame pranešimą
    const text = (message == null ? '' : String(message)).trim();
    if (!text) return;

    const container = ensureToastContainer();

    // Riboti toast'ų skaičių
    while (container.children.length >= MAX_TOASTS) {
        removeToast(container.firstElementChild);
        // Jei removeToast turi 300ms animaciją, bet mes norime iš karto
        if (container.firstElementChild) {
            container.removeChild(container.firstElementChild);
        }
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const textSpan = document.createElement('span');
    textSpan.className = 'toast-message';
    textSpan.textContent = text;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'toast-close';
    closeBtn.setAttribute('aria-label', 'Uždaryti pranešimą');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => removeToast(toast));

    toast.appendChild(textSpan);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => removeToast(toast), duration);
    }
}

// Eksportuojame (jei kas nors naudoja module sistemą)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showToast, removeToast };
}