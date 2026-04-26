<script lang="ts">
    import '../app.css';

    export let error: App.Error & { message?: string };
    export let status: number;

    const isDatabaseUnavailable = status === 503
        && error.message?.includes('Unable to reach database.') === true;
    const isLocalDatabaseGuidance = error.message?.includes('Run npm run db:compose:up') === true;
</script>

<main class="page stack">
    <section class="panel error-state">
        <div class="error-kicker">{status}</div>
        <h1>{isDatabaseUnavailable ? 'Database Unavailable' : 'Request Failed'}</h1>

        {#if isDatabaseUnavailable}
            <p>
                The app could not connect to its runtime database, so this page cannot be loaded right now.
            </p>
            {#if isLocalDatabaseGuidance}
                <p class="muted">
                    For local development, start the database service with <code>npm run db:compose:up</code>
                    and confirm <code>DATABASE_URL</code> points at the expected instance.
                </p>
            {:else}
                <p class="muted">
                    Check the deployed <code>DATABASE_URL</code>, database permissions, and network access to the runtime database.
                </p>
            {/if}
        {:else}
            <p>{error.message || 'An unexpected server error occurred.'}</p>
        {/if}

        <div class="inline-actions">
            <a class="btn" href="/">Return Home</a>
        </div>

        {#if error.message}
            <pre class="error-detail"><code>{error.message}</code></pre>
        {/if}
    </section>
</main>
<!-- apply-patch-anchor - do not delete -->
