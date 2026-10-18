type TimeUnit = 'd' | 'h' | 'm' | 's';

const multipliers: Record<TimeUnit, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
};

export function toMs(value: number, unit: TimeUnit): number {
    return value * multipliers[unit];
}
