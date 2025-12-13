const express = require("express");
const router = express.Router();
const dogs = require("../dogData.js");
const {ValidationError, NotFoundError} = require("../errors.js");

router.get("/dogs", (req, res) => {
	res.json(dogs);
});

router.post("/adopt", (req, res, next) => {
  try {
    const { name, email, dogName } = req.body;
    if (!name || !email || !dogName) {
        throw new ValidationError();
    }

    const dog = dogs.find((d) => d.name === dogName);
    if (!dog || dog.status !== "available") {
      throw new NotFoundError();
    }

    return res.status(201).json({
        message: `Adoption request received. We will contact you at ${email} for further details.`,
        requestId: req.requestId
    });
} catch (err) {
    next(err);
}
});

router.get("/error", (req, res) => {
	throw new Error("Test error");
});

module.exports = router;
