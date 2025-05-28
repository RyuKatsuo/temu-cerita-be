const { options } = require("joi");
const { createArticleHandler, getAllArticleHandler, getAllCategories } = require("../controllers/articleController");

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
  {
    method: "GET",
    path: "/articles",
    handler: getAllArticleHandler,
  },
  {
    method: "POST",
    path: "/articles",
    handler: createArticleHandler,
    options: {
      payload: {
        output: "stream",
        parse: false,
        maxBytes: 5 * 1024 * 1024, // 5MB
        allow: "multipart/form-data",
      },
    },
  },
  {
    method: "GET",
    path: "/articles/add",
    handler: getAllCategories,
  },
];

module.exports = articleRoutes;
