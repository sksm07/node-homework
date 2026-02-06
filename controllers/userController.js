const {StatusCodes} = require("http-status-codes");
const { userSchema } = require("../validation/userSchema");

const prisma = require("../db/prisma");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);

const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");

const cookieFlags = (req) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only when HTTPS is available
    sameSite: "Strict",
  };
};

const setJwtCookie = (req, res, user) => {
  // Sign JWT
  const payload = { 
    id: user.id, 
    csrfToken: randomUUID() 
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }); // 1 hour expiration
  // Set cookie.  Note that the cookie flags have to be different in production and in test.
  res.cookie("jwt", token, { 
    ...cookieFlags(req), 
    maxAge: 3600000 
  }); 

  return payload.csrfToken; // this is needed in the body returned by logon() or register()
};

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

const register = async (req, res, next) => {
  let isPerson = false;
  if (req.body.recaptchaToken) {
    const token = req.body.recaptchaToken;
    const params = new URLSearchParams();
    params.append("secret", process.env.RECAPTCHA_SECRET);
    params.append("response", token);
    params.append("remoteip", req.ip);
    const response = await fetch(
      // might throw an error that would cause a 500 from the error handler
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        body: params.toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    const data = await response.json();
    if (data.success) isPerson = true;
    delete req.body.recaptchaToken;
  } else if (
    process.env.RECAPTCHA_BYPASS &&
    req.get("X-Recaptcha-Test") === process.env.RECAPTCHA_BYPASS
  ) {
    // might be a test environment
    isPerson = true;
  }
  if (!isPerson) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "We can't tell if you're a person or a bot." });
  }
  if (!req.body) req.body = {};
  
  const {error, value} = userSchema.validate(req.body, {abortEarly: false,});
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ 
      message: "Validation failed",
      details: error.details,
    });
  }

  const name = value.name;
  const email = value.email.toLowerCase();
  const hashedPassword = await hashPassword(value.password);
    
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create user account (similar to Assignment 6, but using tx instead of prisma)
      const newUser = await tx.user.create({
        data: { email, name, hashedPassword },
        select: { id: true, email: true, name: true }
      });

      // Create 3 welcome tasks using createMany
      const welcomeTaskData = [
        { title: "Complete your profile", userId: newUser.id, priority: "medium" },
        { title: "Add your first task", userId: newUser.id, priority: "high" },
        { title: "Explore the app", userId: newUser.id, priority: "low" }
      ];
      await tx.task.createMany({ data: welcomeTaskData });

      // Fetch the created tasks to return them
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: { in: welcomeTaskData.map(t => t.title) }
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true
        }
      });

      return { user: newUser, welcomeTasks };
    });

    const csrfToken = setJwtCookie(req, res, result.user);
    
    return res.status(StatusCodes.CREATED).json({
      user: {
        name: result.user.name,
        email: result.user.email,
      },
      csrfToken,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success"
    });
    
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Email already registered" });
    } else {
      return next(err); 
    }
  }
};

const logon = async (req, res, next) => {
  let {email, password} = req.body;

  try {
    email = email.toLowerCase();
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        hashedPassword: true
      }
    }); 

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication Failed" });
    }

    const isValid = await comparePassword(
      password, 
      user.hashedPassword
    );

    if (!isValid) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication Failed" });
    }

    const csrfToken = setJwtCookie(req, res, user);

    return res.status(StatusCodes.OK).json({
      name: user.name,
      email: user.email,
      csrfToken,
    });
  } catch (err) {
    if (typeof next === "function") return next(err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error" });
  }
};

const logoff = (req, res) => {
  res.clearCookie("jwt", cookieFlags(req))
  return res.status(StatusCodes.OK).json({
    message: "logged out",
  });
}

module.exports = {register, logon, logoff};