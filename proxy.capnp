using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [
    ( name = "main", worker = .worker ),
    ( name = "internet", network = ( allow = ["private", "public"] ) ),
  ],
  sockets = [
    ( name = "http", http = (), service = "main" ),
  ],
);

const worker :Workerd.Worker = (
  compatibilityDate = "2023-12-18",
  modules = [
    ( name = "index.mjs",
      esModule =
        `export default {
        `  fetch(request, env, ctx) {
        `    return fetch(request.headers.get("Target"), request);
        `  }
        `}
    ),
  ],
);
