export async function getWebCamMedia(): Promise<MediaStream> {
  const constraints = { video: true, audio: true };
  return navigator.mediaDevices.getUserMedia(constraints);
}

export async function getWaitingMedia(video: any): Promise<MediaStream | null> {
  if ('captureStream' in video) {
    return video.captureStream();
  } else if ('mozCaptureStream' in video) {
    return video.mozCaptureStream();
  } else {
    return null;
  }
}
