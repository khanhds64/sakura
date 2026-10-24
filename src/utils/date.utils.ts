import { DateTime } from "luxon";

export const DATE_FORMAT_YYYYMMDD_HYPHEN = "yyyy-MM-dd";
export const VIETNAM_ZONE = "Asia/Ho_Chi_Minh"

export function isValidDate(value: string): boolean {
    // Checks both the format and whether the date is valid
    const date = DateTime.fromFormat(value, DATE_FORMAT_YYYYMMDD_HYPHEN);

    return date.isValid;
}


