import { BadRequestException } from '@nestjs/common';
import { ErrorCode } from '../errors/error-code.enum.js';

export const appTimeZone = (): string =>
  process.env.APP_TIMEZONE || 'Africa/Cairo';

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

export const todayIso = (now: Date = new Date()): string => {
  const timeZone = appTimeZone();
  let formatter = dayFormatters.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dayFormatters.set(timeZone, formatter);
  }

  return formatter.format(now);
};

export function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function assertValidDateRange(startDate: string, endDate: string): void {
  if (!isRealDate(startDate) || !isRealDate(endDate)) {
    throw new BadRequestException({
      code: ErrorCode.INVALID_DATE,
      message: 'startDate and endDate must be valid dates',
    });
  }

  if (startDate >= endDate) {
    throw new BadRequestException({
      code: ErrorCode.INVALID_DATE_RANGE,
      message: 'startDate must be before endDate',
    });
  }
}

export function assertEndDateNotInPast(endDate: string): void {
  if (endDate < todayIso()) {
    throw new BadRequestException({
      code: ErrorCode.END_DATE_IN_PAST,
      message: 'endDate must not be in the past',
    });
  }
}
