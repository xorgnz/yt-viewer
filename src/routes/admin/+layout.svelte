<script lang="ts">
    // Basic admin layout with navigation
</script>

<nav class="admin-subnav">
    <a href="/admin">Admin Home</a>
    <a href="/admin/source-channels">Source Channels</a>
    <a href="/admin/virtual-channels">Virtual Channels</a>
    <a href="/admin/assignments">Assignments</a>
    <form method="POST" action="/admin/logout">
        <button type="submit">Logout</button>
    </form>
</nav>

<slot />
