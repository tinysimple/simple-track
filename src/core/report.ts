import {
  ICommonReportParams,
  IEventParams,
  IReportParams,
  RequestMethod,
  IReportClassOptions,
  Callback,
  IStorageQueryRange,
} from '../types';
import {
  __sunshine_track__,
  getCurrentDomain,
  getCurrentHref,
  getUUID,
  getUserAgent,
  Queue,
  log,
  isSupportFetch,
  warning,
  getTimestamp,
  checkIsIndexedDBSupported,
  parseQueryToIDBKeyRange,
} from '../utils';
import { isFunction, isArray } from 'lodash-es';
import { db } from './setup/cache/cache';
import { getDbStatus } from './setup/cache/index';
import { DB_EVENT_LOCAL_STORE_NAME } from '../configs';

export class Report {
  private queue = new Queue();
  private options!: IReportClassOptions;
  recordScreenEnable!: boolean;
  // private uuid: string;

  constructor() {
    // this.uuid = getUUID();
  }

  getHeaders() {
    const { headers = {} } = this.options;

    return isFunction(headers) ? headers() : headers;
  }

  getUserId() {
    const { userId } = this.options;

    return isFunction(userId) ? userId() : userId;
  }

  setOptions(options: IReportClassOptions) {
    this.options = options;
  }

  getCommonReportData(): ICommonReportParams {
    return {
      userId: this.getUserId(),
      uuid: getUUID(),
      domain: getCurrentDomain(),
      href: getCurrentHref(),
      userAgent: getUserAgent(),
      deviceInfo: __sunshine_track__.deviceInfo,
    };
  }

  getReportData(data: IEventParams): IReportParams {
    return {
      ...data,
      ...this.getCommonReportData(),
    };
  }

  getEnableLocalSave() {
    const { enableLocalSave } = this.options;
    if (typeof enableLocalSave === 'function') {
      return !!enableLocalSave();
    }
    return !!enableLocalSave;
  }

  getSaveDaysMills() {
    let { saveDays = 7 } = this.options;
    if (typeof saveDays !== 'number' || !saveDays || saveDays <= 0) {
      saveDays = 7;
    }
    return saveDays * 24 * 60 * 60 * 1000;
  }

  async send(data: IEventParams | IEventParams[], beforeSend?: Callback) {
    const currentData = isArray(data) ? data : [data];

    const { url, format, customReport, reportType = 'http', isReport } = this.options;

    let result = currentData.map(item => this.getReportData(item));

    // 开启录屏，由@sunshine-track/recordScreen 插件控制 （暂不做）
    // if (this.recordScreenEnable) {
    //   if (options.recordScreenTypeList.includes(data.type)) {
    //     // 修改hasError
    //     _support.hasError = true;
    //     data.recordScreenId = _support.recordScreenId;
    //   }
    // }
    result = isFunction(format) ? format(result) : result;

    if (isFunction(isReport) && !isReport(result)) {
      log('Cancel Report', result);
      return;
    }

    log('Report data：', result);

    if (checkIsIndexedDBSupported() && this.getEnableLocalSave()) {
      const dbInitPromise = getDbStatus();
      if (dbInitPromise) {
        dbInitPromise.then?.(() => {
          try {
            db.remove(
              DB_EVENT_LOCAL_STORE_NAME,
              IDBKeyRange.upperBound(getTimestamp() - this.getSaveDaysMills()),
            ).catch(err => {
              warning(err);
            });
            for (const item of currentData) {
              const { data } = item || {};
              if (Object.prototype.toString.call(data) === '[object PerformanceLongTaskTiming]') {
                item.data = JSON.parse(JSON.stringify(item.data));
              }
              db.add(DB_EVENT_LOCAL_STORE_NAME, item).catch(err => {
                warning(err);
              });
            }
          } catch (err) {
            warning('[set/remove report data into indexDB error]' + err);
          }
        });
      }
    }

    beforeSend?.();

    if (isFunction(customReport)) {
      customReport(result);
      return;
    }

    if (result) {
      switch (reportType) {
        case 'beacon':
          this.beaconReport(url, result);
          break;
        case 'img':
          this.imgReport(url, result);
          break;
        default:
          this.httpReport(url, result);
          break;
      }
    }
  }

  async getLocalRecord(query?: IStorageQueryRange, count?: number) {
    const enableLocalSave = this.getEnableLocalSave();
    if (!enableLocalSave) {
      return null;
    }
    const queryRange = query && parseQueryToIDBKeyRange(query);
    const searchParams = [];
    if (queryRange) {
      searchParams.push(queryRange);
    }
    if (count != undefined) {
      searchParams.push(count);
    }
    return (await db.getAll(DB_EVENT_LOCAL_STORE_NAME, ...searchParams)) || [];
  }

  beaconReport(url: string, data: IReportParams[]): boolean {
    return navigator.sendBeacon(url, JSON.stringify(data));
  }

  async fetchReport(url: string, data: IReportParams[]) {
    const requestFun = () => {
      fetch(`${url}`, {
        method: RequestMethod.POST,
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          ...this.getHeaders(),
        },
      });
    };
    this.queue.addFn(requestFun);
  }

  async xhrReport(url: string, data: IReportParams[]) {
    const requestFun = () => {
      const xhr = new XMLHttpRequest();
      xhr.open(RequestMethod.POST, url, true); // 指定请求方法和地址

      xhr.setRequestHeader('Content-Type', 'application/json'); // 设置请求头（可选，根据实际需求设置）

      const headers = this.getHeaders();
      const headerKeys = Object.keys(headers);

      if (headerKeys.length) {
        headerKeys.forEach(key => {
          xhr.setRequestHeader(key, headers[key]);
        });
      }

      xhr.onreadystatechange = function () {
        // if (xhr.readyState === 4 && xhr.status === 200) {
        //   // 请求完成且响应状态为200
        //   var response = JSON.parse(xhr.responseText); // 解析响应数据
        // }
      };

      xhr.send(JSON.stringify(data));
    };
    this.queue.addFn(requestFun);
  }

  async httpReport(url: string, data: IReportParams[]): Promise<void> {
    if (isSupportFetch()) {
      this.fetchReport(url, data);
    } else {
      this.xhrReport(url, data);
    }
  }

  imgReport(url: string, data: IReportParams[]): void {
    const requestFun = () => {
      const img = new Image();
      const spliceStr = url.indexOf('?') === -1 ? '?' : '&';
      img.src = `${url}${spliceStr}data=${encodeURIComponent(JSON.stringify(data))}`;
    };
    this.queue.addFn(requestFun);
  }
}

const report = new Report();

__sunshine_track__.report = report;

export default report;
