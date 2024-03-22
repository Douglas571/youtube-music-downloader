function findClosestVideoByDuration(songDurationMs, videos) {
    const closestVideo = videos.reduce((closest, video) => {
        console.log(video)
      const videoDurationMs = video.duration_ms;
      const durationDifference = Math.abs(songDurationMs - videoDurationMs);
      const currentDifference = Math.abs(songDurationMs - closest.duration_ms);
  
      return ((videoDurationMs >= songDurationMs) && (durationDifference < currentDifference)) ? video : closest;
    }, videos[0]); // Start with the first video as the initial closest
  
    return closestVideo;
}

exports.pairVideosWithSong = (allVideos, songs) => {    
    songs = songs.map( song => {
        let videos = song.videos.map( video => {
            let details = allVideos.find( ({id}) => id === video.id.videoId)
            return details 
        })

        console.log({videos})

        let preferred_video = findClosestVideoByDuration(song.duration_ms, videos)

        return { ...song, videos, preferred_video }
    })

    // console.log(JSON.stringify(songs, null, 2))

    return songs
}