import { type CacheType, type IEventParams, type IEventOptions } from '../../types';
import { getTimestamp, warning, __sunshine_track__ } from '../../utils';
import { isPlainObject, cloneDeep } from 'lodash-es';
import { db, storage } from '../setup/cache/cache';
import { DB_EVENT_STORE_NAME } from '../../configs';
import report from '../report';

export class EventTrack {
  private data: IEventParams[] = [];
  private cacheType!: CacheType;
  private projectKey!: string;
  private maxEvents!: number;

  setOptions(options: IEventOptions) {
    const { projectKey, cacheType = 'normal', maxEvents } = options;
    this.projectKey = projectKey;
    this.cacheType = cacheType;
    this.maxEvents = maxEvents;
  }

  validate(params: IEventParams) {
    if (!isPlainObject(params)) {
      warning('report params validate error');
      return false;
    }
    const keys = ['category', 'data', 'status', 'time', 'type'];
    if (Object.keys(params).some(key => !keys.includes(key))) {
      warning('report params validate error');
      return false;
    }

    return true;
  }

  async add(params: IEventParams) {
    const { maxEvents } = this;
    const currentParams = params;
    currentParams.time = currentParams.time || getTimestamp();
    if (!this.validate(currentParams)) return;
    let data: IEventParams[] = [];
    switch (this.cacheType) {
      case 'storage':
        storage.putItem(this.projectKey, currentParams);
        data = storage.getItem<IEventParams[]>(this.projectKey) || [];
        break;
      case 'db':
        await db.add(DB_EVENT_STORE_NAME, currentParams);
        data = (await db.getAll(DB_EVENT_STORE_NAME)) || [];
        break;
      default:
        this.data.push(currentParams);
        data = this.data;
        break;
    }
    if (data.length >= maxEvents) {
      this.report(cloneDeep(data));
    }
  }

  async getCachedData() {
    const { cacheType, projectKey } = this;
    switch (cacheType) {
      case 'storage':
        return storage.getItem<IEventParams[]>(projectKey) || [];
      case 'db':
        return (await db.getAll(DB_EVENT_STORE_NAME)) || [];
      default:
        return this.data;
    }
  }

  async clearReportData() {
    const { cacheType, projectKey } = this;
    switch (cacheType) {
      case 'storage':
        storage.removeItem(projectKey);
        break;
      case 'db':
        await db.clear(DB_EVENT_STORE_NAME);
        break;
      default:
        this.data = [];
        break;
    }
  }

  async report(data: IEventParams[]) {
    await this.clearReportData();
    report.send(data, () => this.clearReportData());
  }

  async reportAll(data: IEventParams[]) {
    const list = await this.getCachedData();
    if (!data.length && !list.length) {
      return;
    }
    const finalList = [...list, ...data];
    await this.clearReportData();
    report.send(finalList, () => this.clearReportData());
  }
}

const eventTrack = new EventTrack();

__sunshine_track__.eventTrack = eventTrack;

export default eventTrack;
