import { describe, expect, it } from 'vitest';
import { ServerActionForm } from '../../src/lib/server/ServerActionForm';

describe('ServerActionForm', () => {
    it('normalizes trimmed strings and positive integers from action form data', () => {
        const formData = new FormData();
        formData.set('name', '  Example Name  ');
        formData.set('id', '12');
        formData.set('blank', '   ');

        const form = new ServerActionForm(formData);

        expect(form.getTrimmedString('name')).toBe('Example Name');
        expect(form.getPositiveInteger('id')).toBe(12);
        expect(form.getNullableTrimmedString('blank')).toBeNull();
    });

    it('preserves existing fallback behavior for empty string fields', () => {
        const formData = new FormData();
        formData.set('intent', '');
        formData.set('watchSeconds', '');

        const form = new ServerActionForm(formData);

        expect(form.getTrimmedString('intent', 'watch')).toBe('watch');
        expect(form.getNumber('watchSeconds', 0)).toBe(0);
    });

    it('merges repeated and csv integer lists into one deduplicated positive-id list', () => {
        const formData = new FormData();
        formData.append('video_id', '5');
        formData.append('video_id', '7');
        formData.set('video_ids', '7, 9, nope, 0, -2, 5, 11');

        const form = new ServerActionForm(formData);

        expect(form.getPositiveIntegerList({
            repeatedField: 'video_id',
            csvField: 'video_ids'
        })).toEqual([5, 7, 9, 11]);
    });

    it('sanitizes return queries and parses enabled flags', () => {
        const formData = new FormData();
        formData.set('return_query', '??filter=active');
        formData.set('spansMultiplePages', '1');

        const form = new ServerActionForm(formData);

        expect(form.getSanitizedQueryString('return_query')).toBe('filter=active');
        expect(form.isEnabled('spansMultiplePages')).toBe(true);
        expect(form.isEnabled('missingFlag')).toBe(false);
    });
});
