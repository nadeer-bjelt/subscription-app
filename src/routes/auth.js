const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const JWT = require("jsonwebtoken");
const checkAuth = require("../middleware/checkAuth");
const stripe = require("../utils/stripe");

const router = express.Router();

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    errors: [{ msg: "Internal server error" }],
    data: null,
  });
};

router.post(
  "/signup",
  body("email").isEmail().withMessage("The email is invalid"),
  body("password").isLength({ min: 5 }).withMessage("The password is invalid"),
  async (req, res, next) => {
    try {
      const validationErrors = validationResult(req);

      if (!validationErrors.isEmpty()) {
        const errors = validationErrors.array().map((error) => ({
          msg: error.msg,
        }));

        return res.status(400).json({ errors, data: null });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({
          errors: [{ msg: "Email already in use" }],
          data: null,
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const stripeCustomer = await stripe.customers.create(
        {
          email,
        },
        {
          apiKey: process.env.STRIPE_SECRET_KEY,
        }
      );
      const newUser = await User.create({
        email,
        password: hashedPassword,
        stripeCustomerId: stripeCustomer.id,
      });

      const token = JWT.sign({ email: newUser.email }, process.env.JWT_SECRET, {
        expiresIn: 360000,
      });

      res.json({
        errors: [],
        data: {
          token,
          user: {
            id: newUser._id,
            email: newUser.email,
            stripeCustomerId: stripeCustomer.id,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        errors: [{ msg: "Invalid credentials" }],
        data: null,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        errors: [{ msg: "Invalid credentials" }],
        data: null,
      });
    }

    const token = JWT.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: 360000,
    });

    res.json({
      errors: [],
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", checkAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user });

    if (!user) {
      return res.status(404).json({
        errors: [{ msg: "User not found" }],
        data: null,
      });
    }

    return res.json({
      errors: [],
      data: {
        user: {
          id: user._id,
          email: user.email,
          stripeCustomerId: user.stripeCustomerId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Error handler middleware
router.use(errorHandler);

module.exports = router;
