/* ==========================================================================
   CUSTOM CALENDAR PICKER KOMPONENTAS
   Pakeičia HTML date lauką į interaktyvų kalendorių.
   
   SVARBU: readOnly paliekame FALSE, kad laukas būtų įtrauktas į FormData.
   Vietoj to naudojame CSS pointer-events + JS apsaugą nuo klaviatūros.
   ========================================================================== */

class CustomCalendarPicker {
    constructor(inputElement) {
        this.input = inputElement;

        // Išsaugome originalų tipą
        this.originalType = this.input.type;

        // NEKEIČIAME į 'text' - paliekame 'date', bet paslepiame native picker'į
        // per CSS. Taip FormData vis tiek įtrauks lauką.
        this.input.setAttribute('autocomplete', 'off');
        this.input.setAttribute('inputmode', 'none');
        this.input.classList.add('custom-calendar-input');

        // Apsauga nuo klaviatūros įvedimo (tik jei norime)
        this.input.addEventListener('keydown', (e) => {
            // Leidžiame Tab, Escape, Enter navigacijai
            if (['Tab', 'Escape', 'Enter'].includes(e.key)) return;
            e.preventDefault();
        });

        this.today = new Date();
        this.parseValue();

        this.init();
    }

    parseValue() {
        if (this.input.value) {
            const parts = this.input.value.split('-');
            if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);
                if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                    this.selectedYear = y;
                    this.selectedMonth = m;
                    this.selectedDay = d;
                }
            }
        } else {
            this.selectedYear = undefined;
            this.selectedMonth = undefined;
            this.selectedDay = undefined;
        }

        this.currentMonth = this.selectedMonth !== undefined ? this.selectedMonth : this.today.getMonth();
        this.currentYear = this.selectedYear !== undefined ? this.selectedYear : this.today.getFullYear();
    }

    init() {
        // Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-calendar-wrapper';
        this.input.parentNode.insertBefore(wrapper, this.input);
        wrapper.appendChild(this.input);

        // Popup
        this.popup = document.createElement('div');
        this.popup.className = 'custom-calendar-popup';
        this.popup.setAttribute('role', 'dialog');
        this.popup.setAttribute('aria-label', 'Kalendorius');
        wrapper.appendChild(this.popup);

        this.render();

        // Atidaryti
        this.input.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeOtherPopups();
            this.popup.classList.toggle('show');
        });

        // Uždaryti paspaudus išorėje
        this._outsideClickHandler = (e) => {
            if (!wrapper.contains(e.target)) {
                this.popup.classList.remove('show');
            }
        };
        document.addEventListener('click', this._outsideClickHandler);

        // Reset
        if (this.input.form) {
            this.input.form.addEventListener('reset', () => {
                setTimeout(() => {
                    this.parseValue();
                    this.render();
                }, 0);
            });
        }
    }

    closeOtherPopups() {
        document.querySelectorAll('.custom-calendar-popup').forEach(p => {
            if (p !== this.popup) p.classList.remove('show');
        });
    }

    render() {
        const monthsLT = [
            'Sausis', 'Vasaris', 'Kovas', 'Balandis',
            'Gegužė', 'Birželis', 'Liepa', 'Rugpjūtis',
            'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'
        ];

        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

        let startingDay = firstDay.getDay() - 1;
        if (startingDay === -1) startingDay = 6;

        // Statinis HTML - be innerHTML su serverio duomenimis
        const popup = document.createElement('div');

        const header = document.createElement('div');
        header.className = 'calendar-header';

        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'calendar-nav-btn';
        prevBtn.setAttribute('aria-label', 'Ankstesnis mėnuo');
        prevBtn.textContent = '‹';

        const title = document.createElement('span');
        title.className = 'calendar-title';
        title.textContent = `${monthsLT[this.currentMonth]} ${this.currentYear}`;

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'calendar-nav-btn';
        nextBtn.setAttribute('aria-label', 'Kitas mėnuo');
        nextBtn.textContent = '›';

        header.appendChild(prevBtn);
        header.appendChild(title);
        header.appendChild(nextBtn);
        popup.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

        ['Pr', 'An', 'Tr', 'Ket', 'Pen', 'Še', 'Sek'].forEach(d => {
            const head = document.createElement('div');
            head.className = 'calendar-day-head';
            head.textContent = d;
            grid.appendChild(head);
        });

        for (let i = 0; i < startingDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day empty';
            grid.appendChild(empty);
        }

        for (let day = 1; day <= lastDay.getDate(); day++) {
            const formattedMonth = String(this.currentMonth + 1).padStart(2, '0');
            const formattedDay = String(day).padStart(2, '0');
            const dateStr = `${this.currentYear}-${formattedMonth}-${formattedDay}`;

            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.dataset.date = dateStr;
            dayEl.textContent = String(day);

            if (this.input.value === dateStr) dayEl.classList.add('selected');
            if (
                day === this.today.getDate() &&
                this.currentMonth === this.today.getMonth() &&
                this.currentYear === this.today.getFullYear()
            ) {
                dayEl.classList.add('today');
            }

            dayEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.input.value = dateStr;
                this.parseValue();
                this.popup.classList.remove('show');
                this.input.dispatchEvent(new Event('change', { bubbles: true }));
                this.render();
            });

            grid.appendChild(dayEl);
        }

        popup.appendChild(grid);
        this.popup.replaceChildren(popup);

        // Navigacija
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.currentMonth--;
            if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
            this.render();
        });

        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.currentMonth++;
            if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
            this.render();
        });
    }
}

function initCalendarPickers() {
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.classList.contains('custom-calendar-initialized')) {
            input.classList.add('custom-calendar-initialized');
            new CustomCalendarPicker(input);
        }
    });
}