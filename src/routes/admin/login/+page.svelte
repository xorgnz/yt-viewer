<script lang="ts">
    export let form: any;
</script>

<div class="page stack">
    <section class="panel" style="max-width: 28rem;">
        <h1>Admin Login</h1>
        <form method="POST" class="stack">
            <label>
                Password
                <input name="password" type="password" required />
            </label>
            <div class="inline-actions">
                <button type="submit">Login</button>
            </div>
            {#if form?.error}
                <p class="error-text">{form.error}</p>
            {/if}
        </form>
    </section>
</div>
