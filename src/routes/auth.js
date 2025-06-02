const {
  registerHandler,
  loginHandler,
  googleLoginHandler,
} = require("../controllers/authController");
const Joi = require("joi");

const authRoutes = [
  {
    method: "POST",
    path: "/register",
    options: {
      auth: false,
      validate: {
        payload: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required(),
          password: Joi.string().min(6).required(),
        }),
        failAction: (request, h, err) => {
          throw err;
        },
      },
    },
    handler: registerHandler,
  },
  {
    method: "POST",
    path: "/login",
    options: {
      auth: false,
      validate: {
        payload: Joi.object({
          email: Joi.string().email().required(),
          password: Joi.string().min(6).required(),
        }),
        failAction: (request, h, err) => {
          throw err;
        },
      },
    },
    handler: loginHandler,
  },
  {
    method: "POST",
    path: "/login/google",
    options: {
      auth: false,
      validate: {
        payload: Joi.object({
          email: Joi.string().email().required(),
          google_id: Joi.string().required(),
          name: Joi.string().required(),
          profile_picture: Joi.string().required(),
        }),
        failAction: (request, h, err) => {
          throw err;
        },
      },
    },
    handler: googleLoginHandler,
  },
];

module.exports = authRoutes;
