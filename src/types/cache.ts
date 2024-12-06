export const enum TransactionType {
  Readwrite = 'readwrite',
  Readonly = 'readonly',
}

export interface IStoreParameter {
  name: string;
  params: IDBObjectStoreParameters;
}

export interface IDBOptions {
  dbName: string;
  dbVersion: number;
  stores?: IStoreParameter[];
  dbNamesuffix: string;
}

export interface IStorageOptions {
  storage?: Storage;
  suffix: string;
  version: number;
}

export interface IStorageQueryRange {
  lower?: any;
  upper?: any;
  lowerOpen?: boolean;
  upperOpen?: boolean;
}
