export type ProfileFields = {
    id: string | number;
    key: string;
    name: string;
};

export class Profile
{
    readonly id: string | number; // stable profile id
    readonly key: string; // same stable value as id
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
            (typeof value.id === 'string' || typeof value.id === 'number') &&
            typeof value.key === 'string' &&
            typeof value.name === 'string'
        );
    }

    with(patch: Update<Profile>): Profile
    {
        return new Profile({
            id: (patch as any).id ?? this.id,
            key: (patch as any).key ?? this.key,
            name: (patch as any).name ?? this.name
        });
    }
}
// apply-patch-anchor - do not delete
