const { formidable } = require("formidable");
const path = require("path");
const fs = require("fs");
const Joi = require("joi");
const { v4: uuidv4 } = require("uuid");
const {
  Article,
  ArticleLikes,
  ArticleComments,
  ArticleCategoryMap,
  Category,
  ArticleSaved,
  User,
  ArticleImages
} = require("../models/relation");
// const sequelize = require("../models/index");
const { Op, Sequelize } = require("sequelize");
const sequelize = require('../models/index');

const createArticleHandler = async (request, h) => {


  // Mulai transaksi
  const t = await sequelize.transaction();

  try {
    const user_id = request.auth.credentials.id; // Pastikan otentikasi sudah di-setup
    const { title, content_html, province, active, city, category, images } = request.payload;

    // 3. Handle Kategori (cari atau buat baru)
    const categoryNameTrimmed = category.trim().toLowerCase();
    let existingCategory = await Category.findOne({
      where: { category: categoryNameTrimmed }, // Asumsi kolom nama di tabel Category adalah 'category'
      transaction: t,
    });

    if (!existingCategory) {
      existingCategory = await Category.create({
        // id: uuidv4(), // Model Category Anda mungkin menangani ID secara otomatis
        category: categoryNameTrimmed,
      }, { transaction: t });
    }

    // 4. Persiapkan data untuk Artikel
    const articleUuid = uuidv4();
    const slug = `${title.toLowerCase().replace(/\s+/g, "-")}-${articleUuid.slice(0, 5)}`;
    const thumbnailUrl = images[0]; // Ambil gambar pertama sebagai thumbnail

    // 5. Buat Artikel
    const article = await Article.create({
      id: articleUuid,
      title,
      slug,
      thumbnail_url: thumbnailUrl,
      content_html,
      province,
      city,
      user_id,
      active,
    }, { transaction: t });

    // 6. Buat entri di ArticleCategoryMap
    await ArticleCategoryMap.create({
      // id: uuidv4(), // Model ArticleCategoryMap Anda mungkin menangani ID
      article_id: article.id,
      article_category_id: existingCategory.id,
    }, { transaction: t });

    // 7. Simpan sisa gambar ke tabel ArticleImage (jika ada)
    if (images.length > 1) {
      const remainingImages = images.slice(1); // Ambil semua gambar setelah yang pertama
      for (const imageUrl of remainingImages) {
        await ArticleImages.create({
          id: uuidv4(), // Model ArticleImage Anda mungkin menangani ID
          image_url: imageUrl,
          article_id: article.id,
        }, { transaction: t });
      }
    }

    // Jika semua berhasil, commit transaksi
    await t.commit();

    return h.response({
      statusCode: 201,
      status: "success",
      message: "Article created successfully",
      data: {
        id: article.id,
        slug: article.slug,
        title: article.title,
        // Sertakan data lain yang relevan jika perlu
      },
    }).code(201);

  } catch (transactionError) {
    // Jika terjadi error, rollback transaksi
    await t.rollback();
    console.error("Error creating article:", transactionError);
    return h.response({
      statusCode: 500,
      status: "error",
      message: "Internal Server Error",
      // detail: transactionError.message // Opsional: tambahkan detail error untuk debugging
    }).code(500);
  }
};

const getCalculatedArticleAttributes = (userId) => {
  const attributes = [
    [
      Sequelize.literal(`(
        SELECT COUNT(*) FROM "Article_likes" AS likes WHERE likes.article_id = "Articles"."id"
      )`),
      "total_likes",
    ],
    [
      Sequelize.literal(`(
        SELECT COUNT(*) FROM "Article_comments" AS comments WHERE comments.article_id = "Articles"."id"
      )`),
      "total_comments",
    ],
    [
      Sequelize.literal(`(
        SELECT name FROM "Users" WHERE "Articles".user_id = "Users"."id"
      )`),
      "authorName",
    ],
  ];

  if (userId) {
    attributes.push([
      Sequelize.literal(`(
          EXISTS (
              SELECT 1 FROM "Article_likes" AS "user_like"
              WHERE "user_like"."article_id" = "Articles"."id"
              AND "user_like"."user_id" = '${userId}'
          )
      )`),
      'isLikedByUser',
    ]);
    attributes.push([
      Sequelize.literal(`(
          EXISTS (
              SELECT 1 FROM "Article_saved" AS "user_save"
              WHERE "user_save"."article_id" = "Articles"."id"
              AND "user_save"."user_id" = '${userId}'
          )
      )`),
      'isSavedByUser',
    ]);
  } else {
    attributes.push([Sequelize.literal('false'), 'isLikedByUser']);
    attributes.push([Sequelize.literal('false'), 'isSavedByUser']);
  }
  return attributes;
};

const getAllArticleHandler = async (request, h) => {
  try {
    const { title, category: categoryQuery, province, city } = request.query;
    const userId = request.auth.isAuthenticated
      ? request.auth.credentials.id
      : null;

    const whereClause = {
      active: true,
    };
    if (title) {
      whereClause.title = { [Op.iLike]: `%${title}%` };
    }
    if (province) {
      whereClause.province = { [Op.iLike]: `%${province}%` };
    }
    if (city) {
      whereClause.city = { [Op.iLike]: `%${city}%` };
    }

    const calculatedAttributes = getCalculatedArticleAttributes(userId);

    const articles = await Article.findAll({
      where: whereClause,
      include: [
        { model: ArticleLikes, as: "likes", attributes: [] },
        { model: ArticleComments, as: "comments", attributes: [] },
        {
          model: ArticleCategoryMap,
          as: "category_maps",
          required: !!categoryQuery,
          attributes: ["id", "article_id", "article_category_id"],
          include: [
            {
              model: Category,
              as: "category",
              attributes: ["id", "category"],
              where: categoryQuery
                ? { category: { [Op.iLike]: `%${categoryQuery}%` } }
                : undefined,
              required: !!categoryQuery,
            },
          ],
        },
        {
          model: ArticleImages, // Tambahkan include untuk ArticleImage
          as: 'images', // Ganti 'articleImages' dengan alias yang Anda gunakan di definisi relasi
          attributes: ['id', 'image_url'], // Pilih atribut yang ingin ditampilkan
          required: false, // Artikel mungkin tidak memiliki gambar tambahan
        }
      ],
      attributes: {
        include: calculatedAttributes,
      },
      order: [["created_at", "DESC"]],
      distinct: true,
    });
    
    return h
      .response({
        statusCode: 200,
        status: "success",
        data: articles,
      })
      .code(200);
  } catch (error) {
    console.error("Error in getAllArticleHandler:", error);
    return h
      .response({
        statusCode: 500,
        status: "error",
        message: "Internal Server Error",
      })
      .code(500);
  }
};

const getArticleBySlug = async (request, h) => {
  try {
    const { slug } = request.params;
    const userId = request.auth.isAuthenticated ? request.auth.credentials.id : null;

    console.log(`[getArticleBySlug] Mencari artikel dengan slug: ${slug}, untuk userId: ${userId}`);

    const calculatedAttributes = getCalculatedArticleAttributes(userId);

    const article = await Article.findOne({
      where: { slug },
      include: [
        {
          model: ArticleCategoryMap,
          as: "category_maps",
          attributes: ['id'],
          include: [
            {
              model: Category,
              as: "category",
              attributes: ["id", "category"], 
            },
          ],
          required: false,
        },
        {
          model: User,
          as: 'author', 
          attributes: ['id', 'name', 'email'],
        },
        {
          model: ArticleImages, // Tambahkan include untuk ArticleImage
          as: 'images', // Ganti 'articleImages' dengan alias yang Anda gunakan di definisi relasi
          attributes: ['id', 'image_url'], // Pilih atribut yang ingin ditampilkan
          required: false, // Artikel mungkin tidak memiliki gambar tambahan
        }
      ],
      attributes: {
        include: calculatedAttributes,
      },
    });

    console.log(`[getArticleBySlug] Hasil findOne untuk slug '${slug}':`, article ? 'Ditemukan' : 'Tidak Ditemukan (null)');
    if (!article) {
      return h.response({
        statusCode: 404,
        status: "fail",
        message: "Article not found",
      }).code(404);
    }

    if (!article.active && article.user_id !== userId) {
      console.log(`[getArticleBySlug] Artikel '${slug}' tidak aktif dan user '${userId}' bukan pemilik.`);
      return h.response({
        statusCode: 404,
        status: "fail",
        message: "Article not found or you do not have permission to view it.",
      }).code(404);
    }

    return h.response({
      statusCode: 200,
      status: "success",
      data: article,
    }).code(200);
  } catch (error) {
    console.error("Error in getArticleBySlug:", error.name, error.message, error.stack); // Log error lebih detail
    return h.response({
      statusCode: 500,
      status: "error",
      message: "Internal Server Error",
    }).code(500);
  }
};

const getAllCategories = async (request, h) => {
  const categories = await Category.findAll();

  return h
    .response({
      statusCode: 200,
      status: "success",
      data: categories,
    })
    .code(200);
};

const postLikeArticle = async (request, h) => {
  try {
    const { articleId } = request.params;
    const article = await Article.findOne({ where: { id: articleId } });

    if (!article || !article.active) {
      return h
        .response({
          statusCode: 404,
          status: "fail",
          message: "Article not found",
        })
        .code(404);
    }

    const user = request.auth.credentials;

    const articleLike = await ArticleLikes.create({
      article_id: articleId,
      user_id: user.id,
    });

    return h
      .response({
        statusCode: 201,
        status: "success",
        message: `Article liked by ${user.email}`,
      })
      .code(201);
  } catch (err) {
    console.error("ERROR LIKING ARTICLE:", err);
    return h
      .response({
        statusCode: 500,
        status: "error",
        message: "Internal Server Error",
      })
      .code(500);
  }
};

const deleteLikeArticle = async (request, h) => {
  try {
    const { articleId } = request.params;
    console.log(articleId, "3100 articcc");
    const article = await Article.findOne({ where: { id: articleId } });

    if (!article || !article.active) {
      return h
        .response({
          statusCode: 404,
          status: "fail",
          message: "Article not found",
        })
        .code(404);
    }

    const user = request.auth.credentials;
    console.log(user.id, "ussserrrrrrr id");
    console.log(user.email, "ussserrrrrrr id");

    const articleLikeByUser = await ArticleLikes.findOne({
      where: {
        article_id: article.id,
        user_id: user.id,
      },
    });

    if (!articleLikeByUser) {
      return h
        .response({
          statusCode: 404,
          status: "fail",
          message: "User has not liked this article.",
        })
        .code(404);
    }

    await articleLikeByUser.destroy();
    return h
      .response({
        statusCode: 200,
        status: "success",
        message: "Success unliked the article",
      })
      .code(200);
  } catch (err) {
    console.error("ERROR UNLIKE ARTICLE:", err);
    return h
      .response({
        statusCode: 500,
        status: "error",
        message: "Internal Server Error",
      })
      .code(500);
  }
};

const postSaveArticle = async (request, h) => {
  try {
    const { articleId } = request.params;
    const article = await Article.findOne({ where: { id: articleId } });

    if (!article || !article.active) {
      return h
        .response({
          statusCode: 404,
          status: "fail",
          message: "Article not found",
        })
        .code(404);
    }

    const user = request.auth.credentials;

    const articleSave = await ArticleSaved.create({
      article_id: articleId,
      user_id: user.id,
    });

    return h
      .response({
        statusCode: 201,
        status: "success",
        message: `Article saved by ${user.email}`,
      })
      .code(201);
  } catch (err) {
    console.error("ERROR SAVED ARTICLE:", err);
    return h
      .response({
        statusCode: 500,
        status: "error",
        message: "Internal Server Error",
      })
      .code(500);
  }
};

const deleteSaveArticle = async (request, h) => {
  try {
    const { articleId } = request.params;
    const article = await Article.findOne({ where: { id: articleId } });

    if (!article || !article.active) {
      return h
        .response({
          statusCode: 404,
          status: "fail",
          message: "Article not found",
        })
        .code(404);
    }

    const user = request.auth.credentials;

    const articleSaveByUser = await ArticleSaved.findOne({
      where: {
        article_id: article.id,
        user_id: user.id,
      },
    });

    if (!articleSaveByUser) {
      return h
        .response({
          statusCode: 404,
          status: "fail",
          message: "User has not saved this article.",
        })
        .code(404);
    }

    await articleSaveByUser.destroy();
    return h
      .response({
        statusCode: 200,
        status: "success",
        message: "Success unsaved the article",
      })
      .code(200);
  } catch (err) {
    console.error("ERROR UNSAVE ARTICLE:", err);
    return h
      .response({
        statusCode: 500,
        status: "error",
        message: "Internal Server Error",
      })
      .code(500);
  }
};

module.exports = {
  createArticleHandler,
  getAllArticleHandler,
  getAllCategories,
  postLikeArticle,
  deleteLikeArticle,
  postSaveArticle,
  deleteSaveArticle,
  getArticleBySlug,
};
