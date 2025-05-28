const { formidable } = require("formidable");
const path = require("path");
const fs = require("fs");
const Joi = require("joi");
const { v4: uuidv4 } = require("uuid");
const { Article, ArticleLikes, ArticleComments, ArticleCategoryMap, Category } = require("../models/relation");
const sequelize = require('../models/index');
const {Op} = require('sequelize');


const createArticleHandler = async (request, h) => {
  const articleSchema = Joi.object({
    title: Joi.string().min(5).required(),
    content_html: Joi.string().required(),
    province: Joi.string().required(),
    city: Joi.string().required(),
    active: Joi.boolean().required(),
    thumbnail: Joi.required(),
    category: Joi.string().required(),
  });

  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB
  });

  return new Promise((resolve, reject) => {
    form.parse(request.raw.req, async (err, fields, files) => {
      if (err) {
        return resolve(
          h
            .response({
              statusCode: 400,
              status: "fail",
              message: "Form parsing error",
            })
            .code(400)
        );
      }

      const { error, value } = articleSchema.validate({
        title: fields.title?.[0],
        content_html: fields.content_html?.[0],
        province: fields.province?.[0],
        active: fields.active?.[0],
        city: fields.city?.[0],
        thumbnail: files.thumbnail?.[0],
        category: fields.category?.[0]
      });

      if (error) {
        return resolve(
          h
            .response({
              statusCode: 400,
              status: "fail",
              message: error.details[0].message,
            })
            .code(400)
        );
      }

      try {
        const user_id = request.auth.credentials.id;
        const { title, content_html, province,active, city, category } = fields;
        const file = files.thumbnail;
        // const receivedMimeType = file.mimetype.toLowerCase();
        // console.log(file[0].mimetype, "===> fileee");

        // Validasi file
        const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
        if (!allowedTypes.includes(file[0].mimetype)) {
          return resolve(
            h
              .response({
                statusCode: 415,
                status: "fail",
                message: "Only jpg, jpeg, and png files are allowed",
              })
              .code(415)
          );
        }

        const ext = path.extname(file[0].originalFilename).toLowerCase();
        const uuid = uuidv4();
        const fileName = `${title[0].replace(/\s+/g, "-")}-${uuid.slice(
          0,
          5
        )}${ext}`;

        // Buat slug dan insert ke DB
        const slug = `${title[0]
          .toLowerCase()
          .replace(/\s+/g, "-")}-${uuid.slice(0, 5)}`;
        
        console.log("97");
        

        let existingCategory = await Category.findOne({
          where: { category: category[0].trim().toLowerCase() },
        });

        console.log("103");
        console.log(existingCategory, "exisssss");
        
        
        if (!existingCategory) {
          existingCategory = await Category.create({
            id: uuidv4(),
            category: category[0].trim().toLowerCase(),
          });
        }

        const article = await Article.create({
          id: uuid,
          title: title[0],
          slug: slug,
          thumbnail_url: fileName,
          content_html: content_html[0],
          province: province[0],
          city: city[0],
          user_id,
          active: active[0],
        });

        await ArticleCategoryMap.create({
          id: uuidv4(),
          article_id: article.id,
          article_category_id: existingCategory.id,
        });

        return resolve(
          h
            .response({
              statusCode: 201,
              status: "success",
              message: "Article created successfully",
              data: article,
            })
            .code(201)
        );
      } catch (error) {
        console.error(error);
        return resolve(
          h
            .response({
              statusCode: 500,
              status: "error",
              message: "Internal Server Error",
            })
            .code(500)
        );
      }
    });
  });
};


const getAllArticleHandler = async (request, h) => {
  try {
    const { title, category } = request.query;

    const whereClause = {};
    if (title) {
      whereClause.title = { [Op.iLike]: `%${title}%` };
    }

    const articles = await Article.findAll({
      where: whereClause,
      include: [
        {
          model: ArticleLikes,
          as: 'likes',
          attributes: [],
        },
        {
          model: ArticleComments,
          as: 'comments',
          attributes: [],
        },
        {
          model: ArticleCategoryMap,
          as: 'category_maps',
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'category'],
              where: category
                ? {
                    category: {
                      [Op.iLike]: `%${category}%`,
                    },
                  }
                : undefined,
            },
          ],
        },
      ],
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*) FROM "Article_likes" AS likes WHERE likes.article_id = "Articles"."id"
            )`),
            'total_likes',
          ],
          [
            sequelize.literal(`(
              SELECT COUNT(*) FROM "Article_comments" AS comments WHERE comments.article_id = "Articles"."id"
            )`),
            'total_comments',
          ],
          [
            sequelize.literal(`(
              SELECT name FROM "Users" WHERE "Articles".user_id = "Users"."id"
            )`),
            'author',
          ],
        ],
      },
      order: [['created_at', 'DESC']],
    });

    return h
      .response({
        statusCode: 200,
        status: 'success',
        data: articles,
      })
      .code(200);
  } catch (error) {
    console.error(error);
    return h
      .response({
        statusCode: 500,
        status: 'error',
        message: 'Internal Server Error',
      })
      .code(500);
  }
};

const getAllCategories = async (request, h) => {
  const categories = await Category.findAll();
  
  return h.response({
    statusCode: 200,
    status: 'success',
    data: categories
  }).code(200);
}

module.exports = { createArticleHandler, getAllArticleHandler, getAllCategories };
