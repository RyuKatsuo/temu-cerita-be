const { init } = require("../../server");

let server;

exports.handler = async (event, context) => {
  if (!server) {
    server = await init();
    await server.initialize(); // Optional, untuk testing mode
  }

  const { path, httpMethod, headers, body } = event;

  const response = await server.inject({
    method: httpMethod,
    url: path.replace("/api", ""),
    headers,
    payload: body,
  });

  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.payload,
  };
};
