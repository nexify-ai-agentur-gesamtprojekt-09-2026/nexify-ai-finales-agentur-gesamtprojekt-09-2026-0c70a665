/* Public installation v1. Network-only: no fetch interception, CacheStorage,
   background sync, push, automatic retry, claim or forced activation.
   The browser owns all requests and network failures, including API and Auth.
   Updates follow the browser lifecycle. There is no private offline data store. */
self.addEventListener('install', () => {});
