declare module 'sql.js' {
  export interface SqlValue {}
  export interface BindParams {}
  export interface Statement {
    bind(values?: any): boolean;
    step(): boolean;
    getAsObject(params?: any): Record<string, any>;
    free(): boolean;
  }
  export interface Database {
    run(sql: string, params?: any): Database;
    exec(sql: string): Array<{ columns: string[]; values: any[][] }>;
    prepare(sql: string, params?: any): Statement;
    getRowsModified(): number;
    close(): void;
  }
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }
  export default function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>;
}
