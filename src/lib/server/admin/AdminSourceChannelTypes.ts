import type { SourceChannel } from '$lib/entities/sourceChannel';

export interface AdminSourceChannelServiceError<TCode extends string = string>
{
    code: TCode;
    status: number;
    message: string;
}

export type AdminSourceChannelServiceResult<
    TSuccess,
    TError extends AdminSourceChannelServiceError = AdminSourceChannelServiceError
> = {
    ok: true;
    data: TSuccess;
} | {
    ok: false;
    error: TError;
};

export interface AdminSourceChannelRedirect
{
    redirectTo: string;
}

export interface AdminSourceChannelPageData
{
    channels: SourceChannel[];
}

export interface AdminSourceChannelLookupData
{
    youtube_id: string;
    title: string;
    description: string;
    thumbnail_url: string | null;
    published_at: number | null;
}

export interface AdminSourceChannelUpsertInput
{
    title: string;
    description: string;
    thumbnail_url: string | null;
    published_at: number | null;
}

export interface CreateAdminSourceChannelInput extends AdminSourceChannelUpsertInput
{
    youtubeInput: string;
}

export interface UpdateAdminSourceChannelInput extends AdminSourceChannelUpsertInput
{
    id: number;
}

export interface DeleteAdminSourceChannelInput
{
    id: number;
}

export interface RefreshAdminSourceChannelInput
{
    id: number;
}

export interface LookupAdminSourceChannelInput
{
    youtubeInput: string;
}
