import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isChinaIdCardNumber } from '../../utils/china-id-card.util';
import { Trim } from '../transform/trim.decorator';

@ValidatorConstraint({ name: 'isChinaIdCardNumber', async: false })
export class IsChinaIdCardNumberConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return isChinaIdCardNumber(value);
  }

  defaultMessage(_args: ValidationArguments) {
    return '请输入正确的身份证号码';
  }
}

export function IsChinaIdCardNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    Trim()(object, propertyName);
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsChinaIdCardNumberConstraint,
    });
  };
}
