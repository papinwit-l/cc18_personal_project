const bcryptjs = require("bcryptjs");
const prisma = require("../config/prisma");

module.exports.login = async (req, res) => {
  try {
    const { identity, password } = req.body;

    // Validation
    if (!identity || !password) {
      return createError(400, "Please provide all fields");
    }
    //check identity key
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^[a-zA-Z0-9_]{6,20}$/;
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
      return createError(400, "Invalid credentials");
    }
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
    // Send response
    res.status(200).json({
      message: "Login successful",
      accessToken: token,
      user,
    });
  } catch (error) {
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
    const usernameRegex = /^[a-zA-Z0-9_]{6,20}$/;
    if (!usernameRegex.test(username)) {
      return createError(400, "Invalid username format");
    }

    // Check if password is valid (e.g., minimum length)
    if (password.length < 8) {
      createError(400, "Password must be at least 8 characters long");
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
    const newUser = prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    // Generate token
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    //set response user
    const { password: pwd, ...user } = newUser;
    // Send response
    res.status(201).json({
      message: "User registered successfully",
      accessToken: token,
      user: user,
    });
  } catch (error) {
    next(error);
  }
};
