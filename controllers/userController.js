const {StatusCodes} = require("http-status-codes");
const { userSchema } = require("../validation/userSchema");

const prisma = require("../db/prisma");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);

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
  if (!req.body) req.body = {};
  global.user_id = null;

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

    // Store the user ID globally for session management (not secure for production)
    global.user_id = result.user.id;
    
    res.status(201).json({
      user: result.user,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success"
    });
    return;
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

   global.user_id = user.id;

   return res.status(StatusCodes.OK).json({
     name: user.name,
     email: user.email
   });
  } catch (err) {
    if (typeof next === "function") return next(err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error" });
  }
};

const logoff = (req, res) => {
  global.user_id = null;
  return res.sendStatus(StatusCodes.OK);
}

module.exports = {register, logon, logoff};