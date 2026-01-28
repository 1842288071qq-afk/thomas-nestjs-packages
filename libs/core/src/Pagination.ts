import { Transform, Type } from 'class-transformer';

/**
 * 统一要求的分页列表数据返回
 */
export interface IPageData<T = Record<string, unknown>> {
  // 列表数据
  rows: T[];
  // 总数
  total: number;
  // 当前页码
  page: number;
  // 每页数量
  pageSize: number;
}

/**
 * 分页查询参数 DTO
 * 请在controller中直接@Query() pagination: PaginationDTO 来使用
 */
export class PaginationDTO {
  @Type(() => Number)
  @Transform(({ value }) => Number(value) || 1)
  page: number = 1;
  @Type(() => Number)
  @Transform(({ value }) => Number(value) || 10)
  pageSize: number = 10;
}

/**
 * list类型查询固定参数
 * 请在controller中使用@Query() listParams: ListParamsDTO 使用
 */
export class ListParamsDTO {
  @Type(() => Number)
  // transform保证limit为number类型，而且默认为10
  @Transform(({ value }) => Number(value) || 10)
  limit: number = 10;
}

/**
 * 统一要求的list列表返回数据
 */
export interface IListData<T = Record<string, unknown>> {
  // 列表数据
  rows: T[];
  // 当前列表的limit限制
  limit?: number;
}
