const bcryptjs = require("bcryptjs");
const prisma = require("../config/prisma");
const createError = require("../utils/createError");
const jwt = require("jsonwebtoken");

module.exports.login = async (req, res, next) => {
  try {
    const { identity, password } = req.body;

    // Validation
    if (!identity || !password) {
      return createError(400, "Please provide all fields");
    }
    //check identity key
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^[a-zA-Z0-9_]{5,20}$/;
    const isEmail = emailRegex.test(identity);
    const isUsername = usernameRegex.test(identity);
    if (!isEmail && !isUsername) {
      return createError(400, "Invalid identity");
    }
    const identityKey = isEmail ? "email" : "username";

    // Check if email or username exists
    const existingUser = await prisma.user.findFirst({
      where: {
        [identityKey]: identity,
      },
    });

    if (!existingUser) {
      return createError(400, "Username or email or password incorrect");
    }

    const profile = await prisma.profile.findFirst({
      where: {
        userId: existingUser.id,
      },
    });

    // Check if password is correct
    const isPasswordCorrect = await bcryptjs.compare(
      password,
      existingUser.password
    );
    if (!isPasswordCorrect) {
      return createError(400, "Invalid credentials");
    }
    // Generate token
    const payload = {
      id: existingUser.id,
      username: existingUser.username,
      email: existingUser.email,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    //set response user
    const { password: pwd, ...user } = existingUser;
    // console.log(user);
    // Send response
    res.status(200).json({
      message: "Login successful",
      accessToken: token,
      user: { ...user, profile },
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.register = async (req, res, next) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      return createError(400, "All fields are required");
    }

    // Check if email is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return createError(400, "Invalid email format");
    }
    // Check if username is valid
    const usernameRegex = /^[a-zA-Z0-9_]{5,20}$/;
    if (!usernameRegex.test(username)) {
      return createError(400, "Invalid username format");
    }

    // Check if password is valid (e.g., minimum length)
    if (password.length < 8) {
      return createError(400, "Password must be at least 8 characters long");
    }

    // Check if password and confirm password match
    if (password !== confirmPassword) {
      return createError(400, "Passwords do not match");
    }

    // Check if email or username exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });
    if (existingUser) {
      return createError(400, "Email or username already exists");
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });
    const newProfile = await prisma.profile.create({
      data: {
        userId: newUser.id,
        name: username,
      },
    });

    // Generate token
    const payload = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    //set response user
    const { password: pwd, ...user } = newUser;
    // console.log(user);
    // Send response
    res.status(201).json({
      message: "User registered successfully",
      accessToken: token,
      user: { ...user, profile: newProfile },
    });
    // res.json({ message: "User registered successfully" });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
