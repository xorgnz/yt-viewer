<script lang="ts">
    // Simple side navigation used across all pages
    export let appName: string = 'YT Viewer';
</script>

<aside class="side-nav" aria-label="Primary Navigation">
    <div class="brand">{appName}</div>
    <nav>
        <a href="/">Home</a>
        <a href="/viewer">Video List</a>
        <a href="/history">History</a>
        <div class="sep" aria-hidden="true"></div>
        <a href="/admin">Admin Home</a>
        <a href="/admin/source-channels">Source Channels</a>
        <a href="/admin/virtual-channels">Virtual Channels</a>
        <a href="/admin/assignments">Assignments</a>
        <a href="/admin/login">Admin Login</a>
    </nav>
</aside>
