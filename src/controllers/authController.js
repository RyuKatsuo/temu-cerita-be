const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models/users");
require("dotenv").config();

const registerHandler = async (request, h) => {
  const { name, email, password } = request.payload;

  // Cek apakah email sudah terdaftar

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return h.response({
      statusCode: '409',
      status: 'fail',
      message: "Email already registered" 
    }).code(409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Buat user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  // Generate JWT
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      admin: user.admin,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  

  return h
    .response({
      statusCode: '201',
      status: 'success',
      message: "User registered successfully",
      token : token,
    })
    .code(201);
};

const loginHandler = async (request, h) => {
  const { email, password } = request.payload;

  // Cek apakah user ada
  const user = await User.findOne({ where: { email } });
  if (!user || !user.active) {
    return h
      .response({
        statusCode: '401',
        status: 'fail', 
        message: "Invalid email or account inactive" 
      })
      .code(401);
  }

  // Cek password
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return h.response({ 
      statusCode: '401',
      status: 'fail', 
      message: "Incorrect password" 
    }).code(401);
  }

  // Buat token
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      admin: user.admin,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return h
    .response({
      statusCode: '200',
      status: 'success', 
      message: "Login successful",
      token: token,
    })
    .code(200);
};

const googleLoginHandler = async (request, h) => {
  try {
    const { google_id, email, name, profile_picture } = request.payload;

    if (!google_id || !email) {
      return h.response({
        statusCode: 400,
        status: "fail",
        message: "Missing required Google data",
      }).code(400);
    }

    // Cek apakah user dengan google_id sudah ada
    let user = await User.findOne({ where: { google_id } });

    if (!user) {
      // Cek jika email sudah digunakan oleh user biasa (yang punya password)
      const existingUser = await User.findOne({ where: { email } });

      if (existingUser) {
        if (!existingUser.google_id) {
          return h.response({
            statusCode: 409,
            status: "fail",
            message: "Email already used by a regular account. Please login with email and password.",
          }).code(409);
        }

        // Email sudah dipakai user Google lain, lanjut login pakai akun itu
        user = existingUser;
      } else {
        // Buat user baru dari akun Google
        user = await User.create({
          name,
          email,
          google_id,
          profile_picture,
          active: true,
        });
      }
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        admin: user.admin,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return h.response({
      statusCode: 200,
      status: "success",
      message: "Login with Google successful",
      token: token,
    }).code(200);
  } catch (err) {
    console.error("GOOGLE LOGIN ERROR:", err);
    return h.response({
      statusCode: 500,
      status: "error",
      message: "Internal Server Error",
    }).code(500);
  }
};

module.exports = { registerHandler, loginHandler, googleLoginHandler };
