<script lang="ts">
    // Basic admin layout with navigation
</script>

<nav style="display:flex; gap: 1rem; padding: 0.5rem 0; border-bottom: 1px solid #ccc; margin-bottom: 1rem;">
    <a href="/admin">Admin Home</a>
    <a href="/admin/channels">Channels</a>
    <a href="/admin/channel-groups">Channel Groups</a>
    <a href="/admin/assignments">Assignments</a>
    <form method="POST" action="/admin/logout" style="margin-left:auto;">
        <button type="submit">Logout</button>
    </form>
    <a href="/viewer">Video List</a>
  </nav>

<slot />
