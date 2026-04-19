<script lang="ts">
    export let src: string;
    export let alt = '';
    export let className = '';
    export let loading: 'eager' | 'lazy' = 'lazy';
</script>

<img
    src={src}
    alt={alt}
    loading={loading}
    class={className}
    referrerpolicy="no-referrer"
/>
<!-- apply-patch-anchor - do not delete -->