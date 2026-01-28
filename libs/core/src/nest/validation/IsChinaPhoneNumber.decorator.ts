import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isChinaPhoneNumber', async: false })
export class IsChinaPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') {
      return false;
    }
    // 中国手机号码正则表达式：^1[3-9]\d{9}$
    const regex = /^1[3-9]\d{9}$/;
    return regex.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid China phone number`;
  }
}

/**
 * 自定义验证器：验证是否为中国手机号码
 * 正则表达式：^1[3-9]\d{9}$
 */
export function IsChinaPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsChinaPhoneNumberConstraint,
    });
  };
}
