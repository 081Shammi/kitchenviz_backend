const express = require('express');
const app = express();
const PORT = process.env.PORT || 4050;
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");



app.use(cors());

app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const API_ROOT ='/' 

const userRoutes = require("./routes/User");
const categoryRoutes = require("./routes/Category");
const productRoutes = require("./routes/Product");
const mediaTypeRoutes = require('./routes/mediaType');
const mediaRoutes = require('./routes/media');


app.use(`${API_ROOT}user`, userRoutes);
app.use(`${API_ROOT}product`, productRoutes);
app.use(`${API_ROOT}category`, categoryRoutes);
app.use(`${API_ROOT}media-type`, mediaTypeRoutes)
app.use(`${API_ROOT}media`, mediaRoutes)


app.get('/', (req, res) => {
    res.send('Hello from Node.js backend!');
  });
  
  
  
  // Database connection
  try {
      const DB_URL = process.env.DB_URL || "mongodb://localhost:27017/kitchenviz";
      const DB_PORT = process.env.PORT || PORT;
  
      mongoose.connect(DB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
          .then(() => {
              console.log("DB Connection Successful");
              app.listen(DB_PORT, () => {
                  console.log(`Server is running on port ${DB_PORT}`);
              });
          })
          .catch(err => {
              console.log("Error in connecting to DB:", err);
          });
  } catch (error) {
      console.log("Error in connecting to DB:", error);
  }
  