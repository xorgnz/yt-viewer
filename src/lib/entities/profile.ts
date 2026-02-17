export type ProfileFields = {
    id: number;
    key: string;
    name: string;
};

export class Profile
{
    readonly id: number; // internal DB id
    readonly key: string; // e.g., 'adult', 'child'
    readonly name: string;

    constructor(data: ProfileFields)
    {
        this.id = data.id;
        this.key = data.key;
        this.name = data.name;
    }

    static validate(value: any): value is Profile
    {
        if (value instanceof Profile) return true;
        return (
            value &&
            typeof value === 'object' &&
            typeof value.id === 'number' &&
            typeof value.key === 'string' &&
            typeof value.name === 'string'
        );
    }
}
