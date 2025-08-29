require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;
const mongoose = require("mongoose");
const morgan = require("morgan");
const helmet = require("helmet");
const path = require("path");
const cors = require("cors");
const cron = require('node-cron');
const fs = require("fs");



app.use(cors());



cron.schedule('01 01 * * *', () => {
    const empty_these_directories = [
        "assets/temp_resources",
        "assets/images",
        "assets/documents",
        // "assets/dis_reports",
    ]
    
    empty_these_directories.map((directory) => { 
        fs.readdir(directory, (err, files) => {
            if (err) throw err;
    
            for (const file of files) {
                fs.unlink(path.join(directory, file), (err) => {
                    if (err) throw err;
                });
            }
        });
    });
});

app.use(cors());

app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

app.use(morgan("dev"));

const payloadLimit = 2 * 1024 * 1024 * 1024; // 2GB in bytes
app.use(express.json({ limit: payloadLimit }));
app.use(express.urlencoded({ limit: payloadLimit, extended: true }));

// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const API_ROOT ='/api/' 
app.use(`${API_ROOT}assets`, express.static(path.join(__dirname, "assets")));
app.disable('etag');

const userRoutes = require("./routes/User");
const categoryRoutes = require("./routes/Category");
const productRoutes = require("./routes/Product");
const mediaTypeRoutes = require('./routes/mediaType');
const mediaRoutes = require('./routes/media');
const sliderRoutes = require('./routes/Sliders');
const orderRoutes = require('./routes/Order');



app.use(`${API_ROOT}user`, userRoutes);
app.use(`${API_ROOT}product`, productRoutes);
app.use(`${API_ROOT}category`, categoryRoutes);
app.use(`${API_ROOT}media-type`, mediaTypeRoutes)
app.use(`${API_ROOT}media`, mediaRoutes)
app.use(`${API_ROOT}slider`, sliderRoutes);
app.use(`${API_ROOT}order`, orderRoutes);


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
  