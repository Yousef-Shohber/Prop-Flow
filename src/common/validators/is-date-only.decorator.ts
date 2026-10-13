import { ValidateBy, ValidationOptions, buildMessage } from 'class-validator';
import { isRealDate } from '../utils/date.util.js';

export function IsDateOnly(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isDateOnly',
      validator: {
        validate: (value: unknown): boolean =>
          typeof value === 'string' && isRealDate(value),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be a valid date in YYYY-MM-DD format`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
