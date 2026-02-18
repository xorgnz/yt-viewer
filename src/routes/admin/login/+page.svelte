<script lang="ts">
    export let form: any;
</script>

<h1>Admin Login</h1>
<form method="POST">
    <label>
        Password
        <input name="password" type="password" required />
    </label>
    <button type="submit">Login</button>
    {#if form?.error}
        <p style="color:red;">{form.error}</p>
    {/if}
</form>
