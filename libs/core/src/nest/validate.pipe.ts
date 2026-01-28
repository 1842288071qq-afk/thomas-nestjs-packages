import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { getMetadataStorage, validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

export interface ValidationErrors {
  errors: string[];
}

/**
 * 参数校验异常
 * 包含详细的校验错误信息
 */
export class ValidationException extends BadRequestException {
  validationErrors: ValidationErrors;
  constructor(validationErrors: ValidationErrors, message?: string) {
    super(message ?? '参数校验失败');
    this.validationErrors = validationErrors;
  }
}

@Injectable()
export class ValidationPipeWithTransform implements PipeTransform<unknown> {
  async transform(
    value: unknown,
    { metatype }: ArgumentMetadata,
  ): Promise<unknown> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // 如果 value 为空，且需要校验（由 metatype 决定），则认为校验失败
    if (value === null || value === undefined) {
      throw new ValidationException({ errors: ['请求数据不能为空'] });
    }

    // 转换并校验
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const object = plainToClass(metatype, value, {
      enableImplicitConversion: false,
    });

    // 检查类是否有任何 class-validator 装饰器
    if (!this.hasValidationMetadata(metatype)) {
      return object; // 没有装饰器，直接返回转换后的对象
    }

    // 获取类的元数据，检查是否有装饰器
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const errors = await validate(object, {
      skipMissingProperties: false, // 不跳过缺失属性
      whitelist: false, // 不自动删除未装饰的属性
      forbidNonWhitelisted: false, // 允许非白名单属性
    });

    if (errors.length > 0) {
      const errorMessages = this.extractErrorMessages(errors);
      throw new ValidationException({ errors: errorMessages });
    }

    return object;
  }

  /**
   * 检查类是否有 class-validator 的验证装饰器
   */
  private hasValidationMetadata(metatype: any): boolean {
    if (!metatype) {
      return false;
    }

    const storage = getMetadataStorage();

    const metas = storage.getTargetValidationMetadatas(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      metatype, // target
      '', // schema (一般用不到)
      false, // always
      false, // strictGroups
    );

    return metas.length > 0;
  }

  private toValidate(metatype: unknown): boolean {
    const types: unknown[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private extractErrorMessages(errors: ValidationError[]): string[] {
    const messages: string[] = [];

    errors.forEach((error) => {
      if (error.constraints) {
        messages.push(...Object.values(error.constraints).map(String));
      }

      if (error.children && error.children.length > 0) {
        messages.push(...this.extractErrorMessages(error.children));
      }
    });

    return messages;
  }
}
