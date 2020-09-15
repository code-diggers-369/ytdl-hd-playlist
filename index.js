const ytlist = require("youtube-playlist");
const fs = require("fs-extra");
const ytdl = require("ytdl-core");
const util = require("util");

const exec = util.promisify(require("child_process").exec);

const printProgress = (message) => {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(message);
};

const createFolders = (folder) => {
  if (!fs.existsSync(`temp`))
    fs.mkdirSync(`temp`, (err) => {
      if (err) {
        console.error("Couldn't create folder download");
        return 0;
      }
      console.info("Successfully created folder download");
    });
  if (!fs.existsSync(`playlist`))
    fs.mkdirSync(`playlist`, (err) => {
      if (err) {
        console.error("Couldn't create folder download");
        return 0;
      }
      console.info("Successfully created folder download");
    });

  if (!fs.existsSync(`playlist/download`))
    fs.mkdirSync(`playlist/download`, (err) => {
      if (err) {
        console.error(`Couldn't create folder playlist/${folder}`);
        return 0;
      }
      console.info(`Successfully created folder playlist/${folder}`);
    });
  return 1;
};

const download = async (url, folder, title, options, index) => {
  try {
    await audioDownload(url, index);
    await videoDownload(url, index, options);
    await jointAudioVideo(title, folder, index);

    console.log("\n\nDone");
  } catch (err) {
    download(url, folder, title, options, index);
  }
};

//
// joint audio and video
const jointAudioVideo = async (title, folder, index) => {
  try {
    await exec(
      `ffmpeg -i temp/video.mp4 -i temp/audio.mp3 -c copy -map 0:v:0 -map 1:a:0 playlist/download/${index}.mp4`
    )
      .then(async () => {
        await fs.renameSync(
          `playlist/download/${index}.mp4`,
          `playlist/download/${index}-${title}.mp4`
        );
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (err) {
    console.log(err);
  }
};

// download audio listener
const audioDownload = async (url) => {
  try {
    const audio = await ytdl(url, {
      filter: "audioonly",
    })
      .on("progress", (_, totalByteReceived, totalByteFile) => {
        printProgress(
          `Audio Download ${((totalByteReceived / totalByteFile) * 100).toFixed(
            2
          )} %`
        );
      })
      .pipe(fs.createWriteStream(`temp/audio.mp3`));

    return new Promise((resolve, reject) => {
      audio.on("finish", resolve);
      audio.on("error", reject);
    });
  } catch (err) {
    console.log(err);
  }
};
//
//
//

// download video listener
const videoDownload = async (url, index, options) => {
  try {
    const video = await ytdl(url, {
      filter: "videoonly",
      quality: "highestvideo",
    })
      .on("progress", (_, totalByteReceived, totalByteFile) => {
        printProgress(
          `Video Download ${((totalByteReceived / totalByteFile) * 100).toFixed(
            2
          )} %`
        );
      })
      .pipe(fs.createWriteStream(`temp/video.mp4`));

    return new Promise((resolve, reject) => {
      video.on("finish", resolve);
      video.on("error", () => {
        videoDownload(url);
      });
    });
  } catch (err) {
    console.log(err);
  }
};

//
//

//
//
//
//
//
//
//
module.exports = (url, options) => {
  ytlist(url, ["url", "name"]).then(async (res) => {
    var { name: foldername, playlist } = res.data;

    var folder = await createFolders(foldername);

    if (folder) {
      var length = playlist.length;

      var repeat = [];
      var indexnum = 0;
      var duplicate = 0;

      for (let i = 0; i < length; i++) {
        const { url, name: title } = playlist[i];

        if (repeat.includes(title)) {
          console.log("\n\nduplicate file skiping");
          duplicate++;
          continue;
        } else {
          repeat.push(title);
          indexnum++;
        }

        console.info(
          `\n\nStarted (${indexnum + "/" + length}) ${title.replace(
            /\||\?|\\|\/|\:|\*|"|\<|\>/g,
            "-"
          )}`
        );
        try {
          await download(
            url,
            foldername.replace(/\||\?|\\|\/|\:|\*|"|\<|\>/g, "-"),
            title.replace(/\||\?|\\|\/|\:|\*|"|\<|\>/g, "-"),
            options,
            indexnum
          );
        } catch (err) {
          console.error(err);
          i--;
        }
      }
      await fs.remove("temp");
      await fs.renameSync("playlist/download", `playlist/${foldername}`);
      console.info(
        `\nCompleted (${
          indexnum + "/" + length
        }) Total Duplicate (${duplicate})`
      );
    } else {
      console.error("Could't create folder. Quititng...");
    }
  });
};
