<script lang="ts">
    export let data: {
        virtualChannel: {
            id: number;
            name: string;
        };
    };
</script>

<div class="page stack">
    <section class="panel">
        <a href="/admin/virtual-channels" class="text-link">Back to Virtual Channels</a>
        <h1>Manage Virtual Channel</h1>
        <p class="muted">This page is the dedicated management route for an existing virtual channel.</p>
    </section>

    <section class="panel stack">
        <div>
            <h2>{data.virtualChannel.name}</h2>
            <p class="muted">Virtual channel ID: {data.virtualChannel.id}</p>
        </div>

        <p>
            Source-channel associations, mode controls, and selected-video review tools will be added here in the
            next tasks.
        </p>
    </section>
</div>
