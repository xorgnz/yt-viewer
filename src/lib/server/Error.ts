export type ErrorFields<TCode extends string = string> = {
    code: TCode;
    status: number;
    message: string;
};

export type ServiceResult<
    TSuccess,
    TError extends ErrorFields = ErrorFields
> = {
    ok: true;
    data: TSuccess;
} | {
    ok: false;
    error: TError;
};

export class ErrorResult
{
    static ok<TSuccess>(data: TSuccess): ServiceResult<TSuccess, never>
    {
        return {
            ok: true,
            data
        };
    }

    static error<TCode extends string>(
        code: TCode,
        status: number,
        message: string
    ): ServiceResult<never, ErrorFields<TCode>>
    {
        return {
            ok: false,
            error: {
                code,
                status,
                message
            }
        };
    }

    static errorWith<TCode extends string, TExtra extends object>(
        code: TCode,
        status: number,
        message: string,
        extra: TExtra
    ): ServiceResult<never, ErrorFields<TCode> & TExtra>
    {
        return {
            ok: false,
            error: {
                code,
                status,
                message,
                ...extra
            }
        };
    }
}
