import { DeepPartial } from './base';
import { EventType, IReportParams } from './event';

type ICustomReport = (data: IReportParams[]) => any;

// type ReportType = 'poll' | 'realtime';
export interface IReportOptions {
  headers?: object | (() => object);
  url: string;
  reportType?: 'img' | 'http' | 'beacon';
  format?: (data: any[]) => any;
  customReport?: ICustomReport;
  isReport?: (data: any[]) => boolean;
}

export type CacheType = 'normal' | 'storage' | 'db';

export interface IGlobalClickListenerItem {
  selector?: string;
  elementText?: string;
  data?: string;
  handler?: (el: Element | Node) => any;
}

export type UserIdType = string | (() => string);

export interface ISwitch {
  xhr: boolean;
  fetch: boolean;
  error: boolean;
  whitescreen: boolean;
  hashchange: boolean;
  history: boolean;
  beforeunload: boolean;
  recordScreen: boolean;
  performance: boolean;
}

export type SwitchMap = Record<EventType, boolean>;

export interface IOptions {
  projectKey: string;
  userId: UserIdType;
  report: IReportOptions;
  cacheType?: CacheType;
  globalClickListeners?: IGlobalClickListenerItem[];
  log?: boolean;
  whiteBoxElements?: string[];
  skeletonProject?: boolean;
  switchs?: Partial<ISwitch>;
  maxEvents?: number;
  checkHttpStatus?: (data: any) => boolean;
  filterHttpUrl?: (url: string, method: string) => boolean;
  historyUrlsNum?: number;
}

export type PartialOptions = DeepPartial<IOptions>;

export type IReportClassOptions = IReportOptions & { userId: UserIdType };
