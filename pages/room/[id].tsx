import { NextPageContext } from 'next';
import React from 'react';
import * as icons from '../../components/icons';
import { getWaitingMedia, getWebCamMedia } from '../../src/frontend/media';
import Room from '../../src/frontend/Room';
import { ID, newID } from '../../src/identifier';

interface ButtonProps {
  onClick(): void;
}

function Button(props: React.PropsWithChildren<ButtonProps>) {
  return (
    <button
      className="p-2 text-white transition-colors duration-500 rounded-full shadow-lg bg-main-700 hover:bg-main-500"
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function ShareButton({ id }: { id: ID }) {
  const url = `https://mooz.cronokirby.com/room/${id}`;
  const title = `Mooz meeting ${id}`;

  const share = () => {
    const nav = navigator as any;
    if (nav.share) {
      nav.share({ title: title, url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  return <Button onClick={share}>{icons.Share(32)}</Button>;
}

function isMuted(media: MediaStream) {
  const track = media.getAudioTracks()[0];
  if (!track) {
    return true;
  }
  return !track.enabled;
}

function toggleMute(media: MediaStream) {
  const track = media.getAudioTracks()[0];
  if (!track) {
    return;
  }
  track.enabled = !track.enabled;
}

function MuteButton({ media }: { media: MediaStream }) {
  const [muted, setMuted] = React.useState(isMuted(media));

  const onClick = () => {
    toggleMute(media);
    setMuted((m) => !m);
  };

  return (
    <Button onClick={onClick}>
      {muted ? icons.MicOff(32) : icons.MicOn(32)}
    </Button>
  );
}

function VideoButton(props: {
  media: MediaStream;
  waitingMedia: MediaStream;
  room: Room;
  showWaiting: boolean;
  setShowWaiting: (b: boolean) => void;
}) {
  const { setShowWaiting, showWaiting, media, waitingMedia, room } = props;
  const onClick = () => {
    if (!showWaiting) {
      room.replaceTrack(
        media.getVideoTracks()[0],
        waitingMedia.getVideoTracks()[0],
      );
      setShowWaiting(true);
    } else {
      room.replaceTrack(
        waitingMedia.getVideoTracks()[0],
        media.getVideoTracks()[0],
      );
      setShowWaiting(false);
    }
  };
  return (
    <Button onClick={onClick}>
      {showWaiting ? icons.VidOff(32) : icons.VidOn(32)}
    </Button>
  );
}

function Buttons({
  id,
  media,
  waitingMedia,
  room,
  showWaiting,
  setShowWaiting,
}: {
  id: ID;
  media: MediaStream | null;
  waitingMedia: MediaStream | null;
  room: Room | null;
  showWaiting: boolean;
  setShowWaiting: (b: boolean) => void;
}) {
  return (
    <div className="absolute bottom-0 left-0 flex flex-col justify-between p-8 space-y-4 md:p-16">
      <ShareButton id={id} />
      {!media ? null : <MuteButton media={media} />}
      {!waitingMedia || !media || !room ? null : (
        <VideoButton
          media={media}
          waitingMedia={waitingMedia}
          room={room}
          showWaiting={showWaiting}
          setShowWaiting={setShowWaiting}
        />
      )}
    </div>
  );
}

function Video(props: {
  className: string;
  media: MediaStream;
  muted: boolean;
}) {
  const ref = React.useRef(null as HTMLVideoElement | null);

  React.useEffect(() => {
    if (!ref.current) {
      return;
    }
    const video = ref.current;
    if ('srcObject' in video) {
      video.srcObject = props.media;
    } else {
      // For older browsers
      (video as any).src = window.URL.createObjectURL(props.media);
    }
  }, [ref]);
  return (
    <video
      autoPlay
      playsInline
      muted={props.muted}
      controls={false}
      ref={ref}
      className={props.className}
    ></video>
  );
}

interface Props {
  id: ID;
  created?: boolean;
}

export default function Page(props: Props) {
  const { current: myID } = React.useRef(props.created ? props.id : newID());
  const [room, setRoom] = React.useState(null as Room | null);
  const waitingVideoRef = React.useRef(null as HTMLVideoElement | null);
  const [myCamera, setMyCamera] = React.useState(null as MediaStream | null);
  const [myWaiting, setMyWaiting] = React.useState(null as MediaStream | null);
  const [remoteStreams, setRemoteStreams] = React.useState([] as MediaStream[]);
  const addStream = (stream: MediaStream) =>
    setRemoteStreams((rs) => [...rs, stream]);
  const [showWaiting, setShowWaiting] = React.useState(false);

  const setupMyWaiting = async () => {
    if (!waitingVideoRef.current) {
      return;
    }
    try {
      const stream = await getWaitingMedia(waitingVideoRef.current);
      if (!stream) {
        return;
      }
      setMyWaiting(stream);
    } catch (error) {
      console.warn('error setting up video', error);
    }
  };

  React.useEffect(() => {
    setupMyWaiting();
  }, [waitingVideoRef]);

  const setupMyCamera = async () => {
    try {
      const stream = await getWebCamMedia();
      if (!stream) {
        return;
      }
      setMyCamera(stream);
    } catch (error) {
      console.warn('error setting up video', error);
    }
  };

  React.useEffect(() => {
    setupMyCamera();
  }, []);

  const setupRoom = () => {
    if (!myCamera) {
      return;
    }
    let room: Room;
    if (props.created) {
      room = Room.host(myID, myCamera, addStream);
    } else {
      room = Room.join(myID, props.id, myCamera, addStream);
    }
    setRoom(room);
  };

  React.useEffect(setupRoom, [myCamera]);

  return (
    <>
      <div
        className={`transition-colors duration-500 w-full h-screen relative ${
          remoteStreams.length > 0 ? 'bg-gray-900' : 'bg-main-100'
        }`}
      >
        <ul className="flex flex-col items-center w-full h-full sm:flex-row md:flex-col lg:flex-row">
          {remoteStreams.map((stream, i) => (
            <li key={i} className="w-full h-full">
              <Video className="w-full h-full" muted={false} media={stream} />
            </li>
          ))}
        </ul>
        <div className="absolute top-0 right-0 w-32 mt-8 mb-8 mr-8 rounded-md shadow-lg sm:w-48 lg:w-64 sm:top-auto sm:bottom-0">
          {!myCamera ? null : (
            <Video
              className={!showWaiting ? 'w-full rounded-md' : 'invisible w-0'}
              media={myCamera}
              muted={true}
            />
          )}
          <video
            autoPlay
            playsInline
            ref={waitingVideoRef}
            className={showWaiting ? 'w-full rounded-md' : 'invisible w-0'}
            controls={false}
            loop
            muted
            src="/Nya.mp4"
          ></video>
        </div>
        <Buttons
          id={props.id}
          media={myCamera}
          waitingMedia={myWaiting}
          room={room}
          showWaiting={showWaiting}
          setShowWaiting={setShowWaiting}
        />
      </div>
    </>
  );
}

Page.getInitialProps = async (ctx: NextPageContext) => {
  return { id: ctx.query.id, created: ctx.query.created };
};
