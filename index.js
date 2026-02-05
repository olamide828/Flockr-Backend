const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
app.use(express.json());
app.use(cors({
  origin: [
      "http://localhost:5173"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
}));
const authRoute = require("./routes/authRoutes");
const productRoute = require("./routes/productRoutes");

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("Database is Running"))
  .catch((error) => console.error("This is our Error:", error));

app.use("/auth", authRoute);
app.use("/products", productRoute);

app.listen(process.env.PORT, () => {
  console.log(`App is listening`);
});


