'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('./index');
const { v4: uuidv4 } = require('uuid');

const User = sequelize.define(
    'Users',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: uuidv4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        admin: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        google_id: {
            type: DataTypes.STRING,
            unique: true
        },
        profile_picture: {
            type: DataTypes.STRING,
        }
    }, 
    {
        modelName: 'User',
        tableName: 'Users',
        underscored: true,
        timestamps: true
    }
);

module.exports = { User }