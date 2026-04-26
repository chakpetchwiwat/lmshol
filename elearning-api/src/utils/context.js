const { AsyncLocalStorage } = require('async_hooks');

const contextStorage = new AsyncLocalStorage();

module.exports = {
  contextStorage,
  runWithContext: (context, fn) => contextStorage.run(context, fn),
  getContext: () => contextStorage.getStore() || {}
};
