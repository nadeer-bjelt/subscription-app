const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const subsRoutes = require("./routes/subs");

dotenv.config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to mongodb");

    const app = express();

    app.use(express.json());
    app.use(cors());
    app.use("/auth", authRoutes);
    app.use("/subs", subsRoutes);
    // app.use("/articles", articlesRoutes);

    app.get("/", (req, res) => {
      res.send("Hello, World!");
    });

    app.listen(8080, () => {
      console.log(`Now listening to port 8080`);
    });
  })
  .catch((error) => {
    console.log({ error });
    throw new Error(error);
  });