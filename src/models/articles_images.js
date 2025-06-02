"use strict";
const { DataTypes } = require("sequelize");
const sequelize = require("./index");
const { v4: uuidv4 } = require("uuid");

const ArticleImages = sequelize.define(
  "Article_images",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true,
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    article_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    modelName: "Article_images",
    tableName: "Article_images",
    underscored: true,
    timestamps: true,
  }
);

module.exports = { ArticleImages }
