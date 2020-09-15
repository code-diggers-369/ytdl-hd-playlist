const ytdl = require("./index");

ytdl(
  "https://www.youtube.com/playlist?list=PLvN7nvnjkvpSdo9RMWB1vhONvo2NVn2e7",
  {
    quality: "highest",
  }
);
