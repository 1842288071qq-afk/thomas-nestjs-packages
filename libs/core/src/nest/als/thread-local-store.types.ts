// 项目可以扩展这个接口，注意
// 因为tsconfig有：{
//  "module": "nodenext",
//  "moduleResolution": "nodenext",
//  "isolatedModules": true
// }
// 编辑器虽然识别全局类型，但实际编译不允许，所以使用ts显式import
declare global {
  interface ThreadLocalStore {
    requestId?: string;
  }
}

export {};
