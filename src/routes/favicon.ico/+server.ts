import { redirect } from '@sveltejs/kit';

export function GET(): never
{
    throw redirect(308, '/favicon.svg');
}
