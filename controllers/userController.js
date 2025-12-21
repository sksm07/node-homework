const {StatusCodes} = require("http-status-codes");
const { userSchema } = require("../validation/userSchema");
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

const register = async (req, res) => {
  if (!req.body) req.body = {};

  const {error, value} = userSchema.validate(req.body, {abortEarly: false,});
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }

  const hashedPassword = await hashPassword(value.password);
  
  const newUser = {
    name: value.name,
    email: value.email,
    hashedPassword,
  };
  
  global.users.push(newUser);
  global.user_id = newUser;
  
  //const { password, ...okUser } = newUser
  res.status(StatusCodes.CREATED).json({
    name: newUser.name,
    email: newUser.email,
  });
};

const logon = async (req, res) => {
  const {email, password} = req.body;

  const user = global.users.find(u => u.email === email);

  if(!user) {
    return res.status(StatusCodes.UNAUTHORIZED).json({message: "Authentication Failed"})    
  }

  const isValid = await comparePassword(password, user.hashedPassword);

  if (!isValid) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }

  global.user_id = user;

  res.status(StatusCodes.OK).json({
    name: user.name,
    email: user.email
  })
}

const logoff = (req, res) => {
  global.user_id = null;
  res.sendStatus(StatusCodes.OK);
}

module.exports = {register, logon, logoff};