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
    const user = await prisma.user.create({
      data: { name, email, hashedPassword },
      select: { id: true, name: true, email: true }, 
    });

    global.user_id = user.id;
        
    return res.status(StatusCodes.CREATED).json({
      name: user.name,
      email: user.email,
    });
    
  } catch (err) {
      if(err.name === "PrismaClientKnownRequestError" && err.code === "P2002") {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Email already registered" });
    }

    // Other errors go here
    return next(err);
  
    }
};

const logon = async (req, res, next) => {
  let {email, password} = req.body;

  try {
    email = email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email }}); 

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