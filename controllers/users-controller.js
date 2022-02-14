const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/userSchema");

const HttpError = require("../models/http-error");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (error) {
    const err = new HttpError(
      "Fetching User failed, please try again later",
      500
    );
    return next(err);
  }
  res.json({
    users: users.map((user) => user.toObject({ getters: true })),
  });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );
  }

  const { name, email, password } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (error) {
    const err = new HttpError("Sign up failed, please try again later", 500);
    return next(err);
  }

  if (existingUser) {
    const err = new HttpError("User already exist", 422);
    return next(err);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    const err = new HttpError("Could not register user, pls try again", 500);
    return next(err);
  }

  const createdUser = new User({
    name,
    email,
    image: req.file.path,
    password: hashedPassword,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError(
      "Signing up fails, please try again later",
      500
    );
    return next(error);
  }

  let token;
  try {
    // token = await jwt.sign(
    token = jwt.sign({ userId: createdUser.id }, "super secret don't share", {
      expiresIn: "1h",
    });
  } catch (error) {
    const err = new HttpError(
      "Signing In failed, please try again later ",
      500
    );
    return next(err);
  }

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
  // .json({ user: createdUser.toObject({ getters: true }), token });
};

const login = async (req, res, next) => {
  // const errors = validationResult(req);
  // if (!errors.isEmpty()) {
  //   return next(
  //     new HttpError("Invalid inputs passed, please check your data", 422)
  //   );
  // }

  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (error) {
    const err = new HttpError("Logging in failed, please try again later", 500);
    return next(err);
  }

  if (!existingUser) {
    const err = new HttpError("Invalid Credentials", 403);
    return next(err);
  }

  // let isValidPassword;
  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (error) {
    const err = new HttpError(
      "Could not log you in, please try again later",
      401
    );
    return next(err);
  }

  if (!isValidPassword) {
    const err = new HttpError("Invalid Credentials", 403);
    return next(err);
  }

  let token;
  try {
    token = await jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      "super secret don't share",
      { expiresIn: "1h" }
    );
  } catch (error) {
    const err = new HttpError(
      "Logging In failed, please try again later ",
      500
    );
    return next(err);
  }

  res.json({
    userId: existingUser.id,
    userId: existingUser.email,
    token,
    // user: existingUser.toObject({ getters: true }),
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
