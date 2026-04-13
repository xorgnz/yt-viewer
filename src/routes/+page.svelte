<script lang="ts">
  const appName = 'YT Viewer';
</script>

<main class="page stack">
    <section class="panel">
        <h1>Welcome to {appName}</h1>
        <p class="muted">Choose a section below to browse videos, inspect watch history, or manage admin data.</p>
    </section>

    <section class="panel">
        <h2>Navigation</h2>
        <ul>
            <li><a href="/viewer/virtual-channels">Choose a Virtual Channel</a></li>
            <li><a href="/viewer">Video List</a></li>
            <li><a href="/history">History</a></li>
            <li><a href="/admin">Admin Home</a> (requires login)</li>
            <li><a href="/admin/source-channels">Admin: Source Channels</a></li>
            <li><a href="/admin/virtual-channels">Admin: Virtual Channels</a></li>
            <li><a href="/admin/login">Admin: Login</a></li>
        </ul>
    </section>
</main>
