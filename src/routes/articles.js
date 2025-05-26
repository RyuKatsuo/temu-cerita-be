const articleRoutes = [
  {
    method: "GET",
    path: "/home",
    handler: (request, h) => {
      const user = request.auth.credentials;

      return h.response({
        message: `Welcome back, ${user.email}`,
        user,
      });
    },
  },
];

module.exports = articleRoutes;
