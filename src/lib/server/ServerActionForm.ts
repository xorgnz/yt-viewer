type PositiveIntegerListFields = {
    repeatedField?: string;
    csvField?: string;
};

export class ServerActionForm
{
    private readonly form: FormData;

    constructor(form: FormData)
    {
        this.form = form;
    }

    static async fromRequest(request: Request): Promise<ServerActionForm>
    {
        return new ServerActionForm(await request.formData());
    }

    getRaw(name: string): FormDataEntryValue | null
    {
        return this.form.get(name);
    }

    getString(name: string, fallback: string | number = ''): string
    {
        return String(this.form.get(name) || fallback);
    }

    getTrimmedString(name: string, fallback: string | number = ''): string
    {
        return this.getString(name, fallback).trim();
    }

    getNullableTrimmedString(name: string): string | null
    {
        const value = this.getTrimmedString(name);
        return value ? value : null;
    }

    getPositiveInteger(name: string): number | null
    {
        const parsed = Number(this.getString(name));

        if (!Number.isInteger(parsed) || parsed <= 0) {
            return null;
        }

        return parsed;
    }

    getNumber(name: string, fallback: string | number = ''): number
    {
        return Number(this.getString(name, fallback));
    }

    isEnabled(name: string): boolean
    {
        return this.getTrimmedString(name) === '1';
    }

    getSanitizedQueryString(name: string): string
    {
        return this.getTrimmedString(name).replace(/^\?+/, '');
    }

    getPositiveIntegerList(fields: PositiveIntegerListFields): number[]
    {
        const values: number[] = [];
        const seen = new Set<number>();
        const rawValues: string[] = [];

        // Combine repeated and CSV field shapes into one normalized integer list.
        if (fields.repeatedField) {
            const repeatedValues = this.form.getAll(fields.repeatedField);
            rawValues.push(...repeatedValues.map((value) => String(value).trim()));
        }

        if (fields.csvField) {
            const csvValue = this.getString(fields.csvField);
            rawValues.push(...csvValue.split(',').map((value) => value.trim()));
        }

        for (const rawValue of rawValues) {
            if (!rawValue) {
                continue;
            }

            const parsed = Number(rawValue);
            if (!Number.isInteger(parsed) || parsed <= 0 || seen.has(parsed)) {
                continue;
            }

            seen.add(parsed);
            values.push(parsed);
        }

        return values;
    }
}
