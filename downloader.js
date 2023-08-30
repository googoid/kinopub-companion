// const request = require('request'),
//   fs = require('fs'),
//   _cliProgress = require('cli-progress');

// const download = (url, filename, callback) => {
//   const progressBar = new _cliProgress.SingleBar(
//     {
//       format: '{bar} {percentage}% | ETA: {eta}s'
//     },
//     _cliProgress.Presets.shades_classic
//   );

//   const file = fs.createWriteStream(filename);
//   let receivedBytes = 0;

//   // Send request to the given URL
//   request
//     .get(url)
//     .on('response', response => {
//       if (response.statusCode !== 200) {
//         return callback('Response status was ' + response.statusCode);
//       }

//       const totalBytes = response.headers['content-length'];
//       progressBar.start(totalBytes, 0);
//     })
//     .on('data', chunk => {
//       receivedBytes += chunk.length;
//       progressBar.update(receivedBytes);
//     })
//     .pipe(file)
//     .on('error', err => {
//       fs.unlink(filename);
//       progressBar.stop();
//       return callback(err);
//     });

//   file.on('finish', () => {
//     progressBar.stop();
//     file.close(callback);
//   });

//   file.on('error', err => {
//     fs.unlink(filename);
//     progressBar.stop();
//     return callback(err);
//   });
// };

const download = require('node-hls-downloader').download;
const fs = require('fs');
const cp = require('child_process');
let episodes = JSON.parse(process.argv[2]);

async function spawnFfmpeg(logger, ffmpegPath, argss) {
  return new Promise((resolve, reject) => {
    logger.log('Spawning FFMPEG', ffmpegPath, argss.join(' '));
    const ffmpeg = cp.spawn(ffmpegPath, argss);
    ffmpeg.on('message', msg => logger.log('ffmpeg message:', msg));
    ffmpeg.on('error', msg => {
      logger.error('ffmpeg error:', msg);
      reject(msg);
    });
    ffmpeg.on('close', status => {
      if (status !== 0) {
        logger.error(`ffmpeg closed with status ${status}`);
        reject(`ffmpeg closed with status ${status}`);
      } else {
        resolve();
      }
    });
    ffmpeg.stdout.on('data', data => logger.log(`ffmpeg stdout: ${data}`));
    ffmpeg.stderr.on('data', data => logger.log(`ffmpeg stderr: ${data}`));
  });
}

(async function start() {
  for (let episode of episodes) {
    console.log(episode);
    let mp4VideoFile = `downloads/${episode.title} - ${episode.audio}.video.mp4`;
    let mp4AudioFile = `downloads/${episode.title} - ${episode.audio}.audio.mp4`;

    // if (!fs.existsSync(mp4VideoFile)) {
    await download({
      mergeUsingFfmpeg: false,
      segmentsDir: 'downloads/segments_video/',
      mergedSegmentsFile: 'downloads/segments_video.ts',
      quality: 'best',
      concurrency: 5,
      outputFile: mp4VideoFile,
      streamUrl: episode.video_uri,
      httpHeaders: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
      }
    });
    // }

    // if (!fs.existsSync(mp4AudioFile)) {
    await download({
      mergeUsingFfmpeg: false,
      segmentsDir: 'downloads/segments_audio/',
      mergedSegmentsFile: 'downloads/segments_audio.ts',
      quality: 'best',
      concurrency: 5,
      outputFile: mp4AudioFile,
      streamUrl: episode.audio_uri,
      httpHeaders: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
      }
    });
    // }

    // ffmpeg -i video.mp4 -i audio.wav -c:v copy -c:a aac output.mp4
    await spawnFfmpeg(console, 'ffmpeg', [
      '-y',
      // '-async',
      // '1',
      '-i',
      mp4VideoFile,
      // '-itsoffset',
      // '-00:00:30.0',
      '-i',
      mp4AudioFile,
      '-c:v',
      'copy',
      '-c:a',
      'copy',
      // '-map',
      // '0:v:0',
      // '-map',
      // '1:a:0',
      // '-shortest',
      `downloads/${episode.title} - ${episode.audio}.mp4`
    ]);
    break;
  }
})().catch(console.error);
