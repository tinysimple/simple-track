import { __sunshine_track__, setLogFlag, validTypes } from '@sunshine-track/utils';
import type {
  CacheType,
  IOptions,
  ISwitch,
  PartialOptions,
  SwitchMap,
} from '@sunshine-track/types';
import { PropType, EventType } from '@sunshine-track/types';
import { merge, isArray, uniqBy } from 'lodash-es';
import eventTrack from './event/event';
import report from './report';

const getInitOptions = (): IOptions => ({
  projectKey: '',
  userId: '',
  report: {
    url: '',
    headers: {},
    reportType: 'http',
  },
  log: false,
  cacheType: 'normal',
  whiteBoxElements: ['html', 'body', '#app', '#root'],
  skeletonProject: false,
  maxEvents: 10,
});

class Options {
  private options: IOptions = getInitOptions();
  private switchMap = {} as SwitchMap;

  constructor(options?: IOptions) {
    if (options) {
      this.options = options;
    }
  }

  get() {
    const {
      projectKey,
      userId = '',
      log = false,
      cacheType = 'normal',
      whiteBoxElements = [],
      skeletonProject = false,
      maxEvents = 10,
      filterHttpUrl,
      checkHttpStatus,
    } = this.options;
    return {
      projectKey,
      userId,
      log,
      cacheType,
      whiteBoxElements,
      skeletonProject,
      report: this.getReport(),
      globalClickListeners: this.getGlobalClickListeners(),
      maxEvents,
      filterHttpUrl,
      checkHttpStatus,
    };
  }

  set(o: PartialOptions) {
    const { options } = this;
    this.options = merge(options, o);
    this.setSwitchMap();
    this.validate();
  }

  setSwitchMap() {
    const {
      xhr,
      fetch,
      error,
      whitescreen,
      hashchange,
      history,
      // recordScreen,
    } = this.getSwitchs();
    this.switchMap[EventType.XHR] = xhr;
    this.switchMap[EventType.Fetch] = fetch;
    this.switchMap[EventType.Error] = error;
    this.switchMap[EventType.WhiteScreen] = whitescreen;
    this.switchMap[EventType.HashChange] = hashchange;
    this.switchMap[EventType.History] = history;
    // this.switchMap[EventType.] = recordScreen
  }

  getSwitchMap() {
    return this.switchMap;
  }

  setHeaders(headers: Object) {
    this.options = merge(this.options, { request: { headers } });
  }

  setCacheType(cacheType: CacheType) {
    this.options = merge(this.options, { cacheType });
  }

  reset() {
    this.options = getInitOptions();
  }

  getReport() {
    const { report } = this.options;
    return report;
  }

  getGlobalClickListeners() {
    const { globalClickListeners } = this.options;
    if (!isArray(globalClickListeners)) return [];
    return uniqBy(globalClickListeners, o => `${o.selector}${o.elementText}${o.data}`);
  }

  getSwitchs(): ISwitch {
    const { switchs = {} } = this.options;
    const {
      xhr = false,
      fetch = false,
      error = false,
      whitescreen = false,
      hashchange = false,
      history = false,
      recordScreen = false,
    } = switchs;

    return {
      xhr,
      fetch,
      error,
      whitescreen,
      hashchange,
      history,
      recordScreen,
    };
  }

  // getCustomReportFn() {
  //     const { customReport } = this.options
  //     return customReport
  // }

  validate() {
    const { report, projectKey } = this.options;
    const { url } = report || {};
    // 校验必填项
    validTypes([
      { field: 'projectKey', type: PropType.String, value: projectKey },
      { field: 'url', type: PropType.Dns, value: url },
    ]);
  }
}

const options = new Options();

__sunshine_track__.options = options;

export const setupOptions = (o: IOptions) => {
  options.set(o);
  const { report: reportOptions, cacheType, maxEvents, projectKey, log } = options.get();
  eventTrack.setOptions({
    cacheType,
    projectKey,
    maxEvents,
  });
  report.setOptions(reportOptions);
  setLogFlag(log);
};

export default options;
