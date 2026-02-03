const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
app.use(express.json());
app.use(cors({}));
const authRoute = require("./routes/authRoutes");

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("Database is Running"))
  .catch((error) => console.error("This is our Error:", error));

app.use("/auth", authRoute);

app.listen(process.env.PORT, () => {
  console.log(`App is listening`);
});


