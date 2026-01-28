export enum CityType {
  PROVINCE = 'PROVINCE',
  CITY = 'CITY',
  AREA = 'AREA',
}

export interface CityNode {
  code: string;
  name: string;
  type: CityType;
  children?: CityNode[];
}

export interface CityTranslateResult {
  code: string;
  name: string;
  type: CityType;
  namePath: string[];
  codePath: string[];
}
