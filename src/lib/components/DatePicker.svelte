<script lang="ts">
    export let label: string;
    export let name: string;
    export let value: string = '';
    export let max: string;
    export let onCommit: (() => void) | null = null;

    type PickerMode = 'day' | 'month-year';

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const weekdayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    let mode: PickerMode = 'day';
    let open = false;
    let viewDate = parseDate(value) ?? parseDate(max) ?? new Date();
    let yearPageStart = startOfYearPage(viewDate.getFullYear());

    $: selectedDate = parseDate(value);
    $: maxDate = parseDate(max) ?? new Date();
    $: if (!open) {
        mode = 'day';
    }
    $: if (value) {
        const parsed = parseDate(value);
        if (parsed) {
            viewDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
            yearPageStart = startOfYearPage(parsed.getFullYear());
        }
    }

    function parseDate(input: string): Date | null
    {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
        if (!match) {
            return null;
        }

        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }

    function formatDate(input: Date): string
    {
        const year = input.getFullYear();
        const month = String(input.getMonth() + 1).padStart(2, '0');
        const day = String(input.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function startOfYearPage(year: number): number
    {
        return year - (year % 12);
    }

    function displayValue(): string
    {
        if (!selectedDate) {
            return 'Any date';
        }

        return `${monthNames[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;
    }

    function daysInMonth(year: number, month: number): number
    {
        return new Date(year, month + 1, 0).getDate();
    }

    function monthOffset(year: number, month: number): number
    {
        return new Date(year, month, 1).getDay();
    }

    function sameDate(left: Date | null, right: Date | null): boolean
    {
        if (!left || !right) {
            return false;
        }

        return (
            left.getFullYear() === right.getFullYear() &&
            left.getMonth() === right.getMonth() &&
            left.getDate() === right.getDate()
        );
    }

    function isFutureDate(input: Date): boolean
    {
        return input.getTime() > maxDate.getTime();
    }

    function moveMonth(delta: number)
    {
        const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
        if (next.getTime() > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1).getTime()) {
            return;
        }

        viewDate = next;
        yearPageStart = startOfYearPage(viewDate.getFullYear());
    }

    function selectDay(day: number)
    {
        const nextDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        if (isFutureDate(nextDate)) {
            return;
        }

        value = formatDate(nextDate);
        open = false;
        onCommit?.();
    }

    function selectYear(year: number)
    {
        viewDate = new Date(year, viewDate.getMonth(), 1);
    }

    function selectMonth(month: number)
    {
        const nextMonth = new Date(viewDate.getFullYear(), month, 1);
        if (nextMonth.getTime() > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1).getTime()) {
            return;
        }

        viewDate = nextMonth;
        mode = 'day';
    }

    function yearOptions(): number[]
    {
        return Array.from({ length: 12 }, (_, index) => yearPageStart + index);
    }

    function canAdvanceYears(): boolean
    {
        return yearPageStart + 12 <= maxDate.getFullYear();
    }

    function clearDate()
    {
        value = '';
        open = false;
        onCommit?.();
    }
</script>

<div class="date-picker">
    <input type="hidden" {name} {value} />
    <details bind:open>
        <summary class="date-trigger">
            <span class="date-trigger-label">{label}</span>
            <span class="date-trigger-value">{displayValue()}</span>
        </summary>

        <div class="date-panel">
            <div class="date-panel-header">
                <button type="button" class="panel-nav" on:click={() => moveMonth(-1)} aria-label={`Previous month for ${label}`}>&lt;</button>
                <button type="button" class="panel-title" on:click={() => mode = mode === 'day' ? 'month-year' : 'day'}>
                    {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
                </button>
                <button
                    type="button"
                    class="panel-nav"
                    on:click={() => moveMonth(1)}
                    aria-label={`Next month for ${label}`}
                    disabled={viewDate.getFullYear() === maxDate.getFullYear() && viewDate.getMonth() === maxDate.getMonth()}
                >&gt;</button>
            </div>

            {#if mode === 'day'}
                <div class="weekday-row">
                    {#each weekdayNames as weekday}
                        <span>{weekday}</span>
                    {/each}
                </div>

                <div class="day-grid">
                    {#each Array(monthOffset(viewDate.getFullYear(), viewDate.getMonth())) as _}
                        <span class="day-spacer"></span>
                    {/each}
                    {#each Array(daysInMonth(viewDate.getFullYear(), viewDate.getMonth())) as _, index}
                        {@const day = index + 1}
                        {@const candidateDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)}
                        <button
                            type="button"
                            class:selected={sameDate(selectedDate, candidateDate)}
                            disabled={isFutureDate(candidateDate)}
                            on:click={() => selectDay(day)}
                        >
                            {day}
                        </button>
                    {/each}
                </div>
            {:else}
                <div class="month-year-panel">
                    <div class="month-panel">
                        {#each monthNames as month, index}
                            <button
                                type="button"
                                class:selected={viewDate.getMonth() === index}
                                disabled={viewDate.getFullYear() === maxDate.getFullYear() && index > maxDate.getMonth()}
                                on:click={() => selectMonth(index)}
                            >
                                {month}
                            </button>
                        {/each}
                    </div>

                    <div class="year-panel">
                        <div class="year-panel-header">
                            <button type="button" class="panel-nav" on:click={() => yearPageStart -= 12} aria-label={`Older years for ${label}`}>&lt;</button>
                            <span>{yearPageStart} - {yearPageStart + 11}</span>
                            <button type="button" class="panel-nav" on:click={() => yearPageStart += 12} aria-label={`Newer years for ${label}`} disabled={!canAdvanceYears()}>&gt;</button>
                        </div>
                        <div class="year-grid">
                            {#each yearOptions() as year}
                                <button
                                    type="button"
                                    class:selected={viewDate.getFullYear() === year}
                                    disabled={year > maxDate.getFullYear()}
                                    on:click={() => selectYear(year)}
                                >
                                    {year}
                                </button>
                            {/each}
                        </div>
                    </div>
                </div>
            {/if}

            <div class="date-panel-actions">
                <button type="button" class="btn btn-secondary" on:click={clearDate}>Clear</button>
            </div>
        </div>
    </details>
</div>

<style>
    .date-picker {
        width: 100%;
    }

    details {
        position: relative;
    }

    summary {
        list-style: none;
    }

    summary::-webkit-details-marker {
        display: none;
    }

    .date-trigger {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        min-height: 2.5rem;
        padding: 0.45rem 0.7rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg-soft);
        cursor: pointer;
    }

    .date-trigger-label {
        color: var(--text-muted);
        font-size: 0.8rem;
    }

    .date-trigger-value {
        color: var(--text);
        font-size: 0.92rem;
    }

    .date-panel {
        position: absolute;
        z-index: 20;
        top: calc(100% + 0.45rem);
        left: 0;
        width: 19rem;
        padding: 0.85rem;
        border: 1px solid var(--border-strong);
        border-radius: var(--radius);
        background: var(--bg-elevated);
        box-shadow: var(--shadow-md);
    }

    .date-panel-header,
    .year-panel-header,
    .date-panel-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
    }

    .panel-title {
        flex: 1;
        justify-content: center;
        background: transparent;
        border-color: transparent;
    }

    .panel-nav {
        min-width: 2rem;
        min-height: 2rem;
        padding: 0;
    }

    .weekday-row,
    .day-grid,
    .year-grid,
    .month-panel {
        display: grid;
        gap: 0.35rem;
    }

    .weekday-row,
    .day-grid {
        grid-template-columns: repeat(7, 1fr);
    }

    .weekday-row {
        margin: 0.85rem 0 0.45rem;
        color: var(--text-soft);
        font-size: 0.78rem;
        text-align: center;
    }

    .day-grid button,
    .year-grid button,
    .month-panel button {
        min-height: 2rem;
        padding: 0.35rem;
    }

    .day-spacer {
        min-height: 2rem;
    }

    .month-year-panel {
        display: grid;
        gap: 0.9rem;
        margin-top: 0.85rem;
    }

    .month-panel {
        grid-template-columns: repeat(4, 1fr);
    }

    .year-panel {
        display: grid;
        gap: 0.6rem;
    }

    .year-grid {
        grid-template-columns: repeat(3, 1fr);
    }

    button.selected {
        background: var(--accent);
        border-color: var(--accent);
        color: #fff;
    }

    .date-panel-actions {
        margin-top: 0.9rem;
        justify-content: flex-end;
    }
    </style>
<!-- apply-patch-anchor - do not delete -->