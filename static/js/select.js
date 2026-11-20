/* ==========================================================================
   CUSTOM SELECT KOMPONENTAS
   - Saugus (textContent, ne innerHTML)
   - Vienas globalus document click listener
   - MutationObserver su apsauga nuo loop
   - Destroy metodas (jei reikia)
   ========================================================================== */

// Globalus click listener - registruojamas vieną kartą
let globalSelectClickHandler = null;

class CustomSelect {
    constructor(selectElement) {
        this.select = selectElement;
        this.wrapper = null;
        this.trigger = null;
        this.optionsContainer = null;
        this.observer = null;
        this.init();
    }

    init() {
        // Slėpti originalų select
        this.select.style.display = 'none';

        // Wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'custom-select-wrapper';
        this.select.parentNode.insertBefore(this.wrapper, this.select);
        this.wrapper.appendChild(this.select);

        // Trigger
        this.trigger = document.createElement('div');
        this.trigger.className = 'custom-select-trigger';
        this.trigger.setAttribute('role', 'button');
        this.trigger.setAttribute('tabindex', '0');
        this.wrapper.appendChild(this.trigger);

        // Options
        this.optionsContainer = document.createElement('div');
        this.optionsContainer.className = 'custom-select-options';
        this.optionsContainer.setAttribute('role', 'listbox');
        this.wrapper.appendChild(this.optionsContainer);

        this.render();
        this.bindEvents();

        // MutationObserver - saugus nuo loop
        this._isRendering = false;
        this.observer = new MutationObserver(() => {
            if (this._isRendering) return;
            this.render();
        });
        this.observer.observe(this.select, {
            childList: true,
            attributes: true,
            attributeFilter: ['disabled', 'multiple']
        });

        // Form reset
        if (this.select.form) {
            this.select.form.addEventListener('reset', () => {
                setTimeout(() => this.render(), 0);
            });
        }
    }

    render() {
        if (this._isRendering) return;
        this._isRendering = true;

        try {
            // Išvalome options
            this.optionsContainer.replaceChildren();

            // Pasirinkto teksto
            const selectedOption = this.select.options[this.select.selectedIndex] || this.select.options[0];
            const displayText = selectedOption ? selectedOption.textContent : '-- Pasirinkite --';

            // Saugus trigger'io turinys
            this.trigger.replaceChildren();
            const textSpan = document.createElement('span');
            textSpan.textContent = displayText;
            this.trigger.appendChild(textSpan);
            const arrow = document.createElement('i');
            arrow.className = 'custom-select-arrow';
            this.trigger.appendChild(arrow);

            // Disabled
            if (this.select.disabled) {
                this.wrapper.classList.add('disabled');
                this.trigger.setAttribute('aria-disabled', 'true');
                this.trigger.setAttribute('tabindex', '-1');
            } else {
                this.wrapper.classList.remove('disabled');
                this.trigger.removeAttribute('aria-disabled');
                this.trigger.setAttribute('tabindex', '0');
            }

            // Options
            Array.from(this.select.options).forEach((opt, index) => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'custom-select-option';
                optionDiv.setAttribute('role', 'option');
                if (opt.disabled) {
                    optionDiv.classList.add('disabled');
                    optionDiv.setAttribute('aria-disabled', 'true');
                }
                if (index === this.select.selectedIndex) {
                    optionDiv.classList.add('selected');
                    optionDiv.setAttribute('aria-selected', 'true');
                }
                optionDiv.textContent = opt.textContent;
                optionDiv.dataset.value = opt.value;

                optionDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (opt.disabled) return;

                    this.select.selectedIndex = index;
                    this.select.dispatchEvent(new Event('change', { bubbles: true }));
                    this.wrapper.classList.remove('open');
                    this.render();
                });

                this.optionsContainer.appendChild(optionDiv);
            });
        } finally {
            this._isRendering = false;
        }
    }

    bindEvents() {
        // Atidaryti/uždaryti
        const toggle = (e) => {
            e.stopPropagation();
            if (this.select.disabled) return;

            const isOpen = this.wrapper.classList.contains('open');
            this.closeAll();

            if (!isOpen) {
                this.wrapper.classList.add('open');
            }
        };

        this.trigger.addEventListener('click', toggle);
        this.trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle(e);
            } else if (e.key === 'Escape') {
                this.wrapper.classList.remove('open');
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.moveSelection(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.moveSelection(-1);
            }
        });

        // Globalus click - registruojamas vieną kartą
        if (!globalSelectClickHandler) {
            globalSelectClickHandler = () => {
                document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
                    w.classList.remove('open');
                });
            };
            document.addEventListener('click', globalSelectClickHandler);
        }

        // Sinchronizacija
        this.select.addEventListener('change', () => this.render());
    }

    moveSelection(direction) {
        const options = Array.from(this.select.options);
        if (options.length === 0) return;

        let newIndex = this.select.selectedIndex + direction;
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= options.length) newIndex = options.length - 1;

        if (options[newIndex] && !options[newIndex].disabled) {
            this.select.selectedIndex = newIndex;
            this.select.dispatchEvent(new Event('change', { bubbles: true }));
            this.render();
        }
    }

    closeAll() {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
            if (w !== this.wrapper) w.classList.remove('open');
        });
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        if (this.wrapper && this.wrapper.parentNode) {
            // Grąžiname select į pradinę vietą
            this.wrapper.parentNode.insertBefore(this.select, this.wrapper);
            this.wrapper.parentNode.removeChild(this.wrapper);
        }
        this.select.style.display = '';
        this.select.classList.remove('custom-select-initialized');
    }
}

function initCustomSelects() {
    document.querySelectorAll('select').forEach(select => {
        if (!select.classList.contains('custom-select-initialized')) {
            select.classList.add('custom-select-initialized');
            new CustomSelect(select);
        }
    });
}