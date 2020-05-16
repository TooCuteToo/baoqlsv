const express = require("express");
const router = express.Router();
const path = require("path");

const publicPath = path.join(__dirname, "dist");

router.get("/", (req, res, next) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

module.exports = router;
