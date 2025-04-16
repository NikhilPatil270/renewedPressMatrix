const mongoose = require('mongoose');
require("dotenv").config();

const conn = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connection to database is successful");
    } catch (err) {
        console.log("Database connection error:", err);
        process.exit(1);
    }
};
conn();