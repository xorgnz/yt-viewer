<script lang="ts">
    export let data: {
        activeProfile: {
            id: string | number;
            key: string;
            name: string;
            splitTimerModeEnabled: boolean;
        };
    };

    export let form:
        | {
            ok?: boolean;
            message?: string;
            activeProfile?: {
                id: string | number;
                key: string;
                name: string;
                splitTimerModeEnabled: boolean;
            };
        }
        | {
            message?: string;
        }
        | null
        | undefined;

    $: activeProfile = form && 'activeProfile' in form && form.activeProfile
        ? form.activeProfile
        : data.activeProfile;
</script>

<div class="page stack">
    <section class="panel settings-panel">
        <h1>Settings</h1>
        <p class="muted">Profile: {activeProfile.name}</p>

        <form method="POST" action="?/saveSplitTimerMode" class="stack">
            <label class="boxed-field">
                <span class="boxed-field-label">Timer display mode</span>
                <select name="splitTimerModeEnabled">
                    <option value="1" selected={activeProfile.splitTimerModeEnabled}>Split daily + extra time</option>
                    <option value="0" selected={!activeProfile.splitTimerModeEnabled}>Simple combined timer</option>
                </select>
            </label>

            <div class="inline-actions">
                <button type="submit">Save</button>
            </div>

            {#if form?.message}
                <p class={form && 'ok' in form && form.ok ? 'status' : 'error-text'}>{form.message}</p>
            {/if}
        </form>
    </section>
</div>

<style>
    .settings-panel {
        max-width: 32rem;
    }

    .boxed-field {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
    }

    .boxed-field-label {
        color: var(--text-muted);
        font-size: 0.9rem;
    }
</style>
<!-- apply-patch-anchor - do not delete -->
