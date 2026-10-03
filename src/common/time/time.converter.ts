export function convertMinutesToMilliseconds(minutes: number): number {
    return minutes * 60 * 1000;
}

export function convertHoursToMilliseconds(hours: number): number {
    return hours * 60 * 60 * 1000;
}

export function convertDaysToMilliseconds(days: number): number {
    return days * 24 * 60 * 60 * 1000;
}