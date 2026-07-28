// Pure decision for the service-worker controllerchange handler. A first installation calls
// clients.claim(), which also emits controllerchange; only an update explicitly accepted by the
// user should reload the page, and it should do so at most once.

export function shouldReloadForServiceWorkerUpdate(
  reloadRequested: boolean,
  alreadyReloaded: boolean
): boolean {
  return reloadRequested && !alreadyReloaded;
}
