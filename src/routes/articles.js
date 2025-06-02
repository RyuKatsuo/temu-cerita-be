const { options } = require("joi");
const {
  createArticleHandler,
  getAllArticleHandler,
  getAllCategories,
  postLikeArticle,
  deleteLikeArticle,
  postSaveArticle,
  deleteSaveArticle,
  getArticleBySlug,
} = require("../controllers/articleController");
const Joi = require("joi");

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
      validate: {
        payload: Joi.object({
          title: Joi.string().min(5).required(),
          content_html: Joi.string().required(),
          province: Joi.string().required(),
          city: Joi.string().required(),
          active: Joi.boolean().required(), // Atau .default(true) jika ingin opsional
          category: Joi.string().required(),
          images: Joi.array()
            .items(Joi.string().uri())
            .min(1)
            .required()
            .messages({
              "array.min":
                "At least one image URL is required in the images array.",
              "string.uri": "Each item in images must be a valid URL.",
            }),
        }),
      },
    },
  },
  {
    method: "GET",
    path: "/articles/{slug}",
    handler: getArticleBySlug,
  },
  {
    method: "GET",
    path: "/articles/add",
    handler: getAllCategories,
  },
  {
    method: "POST",
    path: "/article/{articleId}/like",
    handler: postLikeArticle,
    options: {
      validate: {
        params: Joi.object({
          articleId: Joi.string().uuid().required(),
        }),
      },
    },
  },
  {
    method: "DELETE",
    path: "/article/{articleId}/like",
    handler: deleteLikeArticle,
    options: {
      validate: {
        params: Joi.object({
          articleId: Joi.string().uuid().required(),
        }),
      },
    },
  },
  {
    method: "POST",
    path: "/article/{articleId}/save",
    handler: postSaveArticle,
    options: {
      validate: {
        params: Joi.object({
          articleId: Joi.string().uuid().required(),
        }),
      },
    },
  },
  {
    method: "DELETE",
    path: "/article/{articleId}/save",
    handler: deleteSaveArticle,
    options: {
      validate: {
        params: Joi.object({
          articleId: Joi.string().uuid().required(),
        }),
      },
    },
  },
];

module.exports = articleRoutes;
