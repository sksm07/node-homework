const { StatusCodes } = require("http-status-codes");

const notFoundMiddleware = (req, res) => {
  res
    .status(StatusCodes.NOT_FOUND)
    .send(`You can't do a ${req.method} for ${req.url}`);
};

module.exports = notFoundMiddleware;