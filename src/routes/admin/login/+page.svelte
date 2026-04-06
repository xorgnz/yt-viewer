<script lang="ts">
    export let form: any;
</script>

<div class="page login-page">
    <section class="panel login-panel">
        <h1>Admin Login</h1>
        <form method="POST" class="stack login-form">
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

<style>
    .login-page {
        display: flex;
        justify-content: center;
    }

    .login-panel {
        width: min(100%, 28rem);
        margin-top: 8vh;
    }

    .login-panel h1 {
        text-align: center;
    }

    .login-form {
        align-items: center;
    }

    .login-form label,
    .login-form .inline-actions,
    .login-form .error-text {
        width: 100%;
    }

    .login-form .inline-actions {
        justify-content: center;
    }
    </style>
