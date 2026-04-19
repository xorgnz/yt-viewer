import { describe, expect, it } from 'vitest';
import { DatabaseFileLayout, DatabaseMode } from '$lib/daos/shared/DatabaseFileLayout';

describe('DatabaseFileLayout', () => {
    it('resolves database paths by mode', () => {
        const layout = new DatabaseFileLayout({
            baseDir: '.tmp-data',
            fileNames: {
                test: 'test.sqlite',
                dev: 'dev.sqlite',
                live: 'live.sqlite'
            }
        });

        expect(layout.resolveDatabasePath(DatabaseMode.Test)).toContain('.tmp-data');
        expect(layout.resolveDatabasePath(DatabaseMode.Test)).toContain('test.sqlite');
        expect(layout.resolveDatabasePath(DatabaseMode.Dev)).toContain('dev.sqlite');
        expect(layout.resolveDatabasePath(DatabaseMode.Live)).toContain('live.sqlite');
    });

    it('creates timestamped artifact file names next to the target database', () => {
        const layout = new DatabaseFileLayout();
        const artifactPath = layout.createTimestampedArtifactPath(
            'D:\\workspaces\\yt-viewer\\.data\\dev.db',
            'bak',
            new Date('2026-04-12T12:34:56')
        );

        expect(artifactPath).toContain('dev-20260412-123456.bak.db');
    });
});
// apply-patch-anchor - do not delete