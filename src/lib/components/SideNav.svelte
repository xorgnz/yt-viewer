<script lang="ts">
    // Simple side navigation used across all pages
    export let appName: string = 'YT Channel Watcher';
</script>

<aside class="side-nav" aria-label="Primary Navigation">
    <div class="brand">{appName}</div>
    <nav>
        <a href="/">Home</a>
        <a href="/viewer">Viewer</a>
        <a href="/history">History</a>
        <div class="sep" aria-hidden="true"></div>
        <a href="/admin">Admin Home</a>
        <a href="/admin/channels">Channels</a>
        <a href="/admin/channel-groups">Channel Groups</a>
        <a href="/admin/assignments">Assignments</a>
        <a href="/admin/login">Admin Login</a>
    </nav>
</aside>

<style>
    .side-nav {
        position: sticky;
        top: 0;
        align-self: flex-start;
        width: 220px;
        min-height: 100vh;
        background: #121212;
        color: #eee;
        border-right: 1px solid #2a2a2a;
        padding: .75rem .5rem 1rem;
        box-sizing: border-box;
    }
    .brand {
        font-weight: 700;
        font-size: 1.05rem;
        padding: .25rem .5rem .5rem;
        color: #fff;
    }
    nav { display: flex; flex-direction: column; gap: 2px; }
    a {
        display: block;
        color: #ddd;
        text-decoration: none;
        padding: .4rem .5rem;
        border-radius: 4px;
    }
    a:hover { background: #1f1f1f; color: #fff; }
    .sep { height: 10px; }
</style>
