import { EventType, type IOptions, type ViewModel } from '../types';
import { setupOptions } from './options';
import { setupCache, setupReplace } from './setup';
import EventCollection from './event';
import { setupDirective } from './directive';
import { warning } from '../utils';

export const init = async (options: IOptions) => {
  setupOptions(options);
  setupReplace();
  await setupCache(options);
};

export const install = (Vue: any, options: IOptions) => {
  init(options);
  setupDirective(Vue);
  const handler = Vue.config.errorHandler;
  Vue.config.errorHandler = function (err: Error, vm: ViewModel, info: string): void {
    try {
      EventCollection[EventType.Error](err);
    } catch (err) {
      warning('Inner Error:' + err);
    }
    if (handler) handler.apply(null, [err, vm, info]);
  };
  // fix：先执行app.use()，再在main.js文件中执行Vue.config.errorHandler自定义错误处理函数，上述代码失效的问题。
  let errorHandler: (...args: any) => void;
  const propertyDesc = Object.getOwnPropertyDescriptor(Vue.config, 'errorHandler');
  Object.defineProperties(Vue.config, {
    errorHandler: {
      configurable: propertyDesc ? !!propertyDesc.configurable : true,
      get: () => errorHandler,
      set: (handler: (...args: any) => void) => {
        if (handler === errorHandler || typeof handler !== 'function') {
          return;
        }
        errorHandler = (err: Error, vm: ViewModel, info: string): void => {
          try {
            EventCollection[EventType.Error](err);
          } catch (err) {
            warning('Inner Error:' + err);
          }
          if (handler) handler.apply(null, [err, vm, info]);
        };
      },
    },
  });
};

// react项目在ErrorBoundary中上报错误
export const errorBoundary = (err: Error): void => {
  EventCollection[EventType.Error](err);
};
