export type ProfileFields = {
    id: string | number;
    key: string;
    name: string;
    splitTimerModeEnabled: boolean;
};

export class Profile
{
    readonly id: string | number; // stable profile id
    readonly key: string; // same stable value as id
    readonly name: string;
    readonly splitTimerModeEnabled: boolean;

    constructor(data: ProfileFields)
    {
        this.id = data.id;
        this.key = data.key;
        this.name = data.name;
        this.splitTimerModeEnabled = data.splitTimerModeEnabled;
    }

    toFields(): ProfileFields
    {
        return {
            id: this.id,
            key: this.key,
            name: this.name,
            splitTimerModeEnabled: this.splitTimerModeEnabled
        };
    }

    static validate(value: any): value is Profile
    {
        if (value instanceof Profile) return true;
        return (
            value &&
            typeof value === 'object' &&
            (typeof value.id === 'string' || typeof value.id === 'number') &&
            typeof value.key === 'string' &&
            typeof value.name === 'string' &&
            typeof value.splitTimerModeEnabled === 'boolean'
        );
    }

    with(patch: Update<Profile>): Profile
    {
        return new Profile({
            id: (patch as any).id ?? this.id,
            key: (patch as any).key ?? this.key,
            name: (patch as any).name ?? this.name,
            splitTimerModeEnabled: (patch as any).splitTimerModeEnabled ?? this.splitTimerModeEnabled
        });
    }
}
// apply-patch-anchor - do not delete
