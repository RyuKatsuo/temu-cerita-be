const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models/users");
require("dotenv").config();

const registerHandler = async (request, h) => {
  const { name, email, password } = request.payload;

  // Cek apakah email sudah terdaftar

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return h.response({ message: "Email already registered" }).code(409);
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
      message: "User registered successfully",
      token,
    })
    .code(201);
};

const loginHandler = async (request, h) => {
  const { email, password } = request.payload;

  // Cek apakah user ada
  const user = await User.findOne({ where: { email } });
  if (!user || !user.active) {
    return h
      .response({ message: "Invalid email or account inactive" })
      .code(401);
  }

  // Cek password
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return h.response({ message: "Incorrect password" }).code(401);
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
      message: "Login successful",
      token,
    })
    .code(200);
};

module.exports = { registerHandler, loginHandler };
