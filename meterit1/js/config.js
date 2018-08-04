const CONFIG = {
  HOST: "http://166.130.115.34",
  URL: "/meterit/mesg/update",
  PORT_PREFIX: "10",
  LANE_START: "602",
  LANE_END: "617",
  JAM_TIMEOUT: 20,
  JAM_THRESHOLD: 5,
  LANE_LENGTH: 24,
}

function generateUrl(id) {
  return `https://jsonp.afeld.me/?callback=?&url=${CONFIG.HOST}:${CONFIG.PORT_PREFIX}${id}${CONFIG.URL}`;
  //return `${CONFIG.HOST}:${CONFIG.PORT_PREFIX}${id}${CONFIG.URL}`;
}
