import { NextPageContext } from 'next';
import React from 'react';
import * as icons from '../../components/icons';
import { listen, makeCall, CallResult } from '../../src/frontend/calling';
import Signaller from '../../src/frontend/Signaller';
import type { ID } from '../../src/identifier';
import { getWebCamMedia, getWaitingMedia } from '../../src/frontend/media';
import type { Instance as Peer } from 'simple-peer';

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
  const url = `https://mooz.cronokirby.now.sh/room/${id}`;
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
  console.log(isMuted(media));
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
  peer: Peer;
  showWaiting: boolean;
  setShowWaiting: (b: boolean) => void;
}) {
  const { setShowWaiting, showWaiting, media, waitingMedia, peer } = props;
  const onClick = () => {
    if (!showWaiting) {
      peer.replaceTrack(
        media.getVideoTracks()[0],
        waitingMedia.getVideoTracks()[0],
        media,
      );
      setShowWaiting(true);
    } else {
      peer.replaceTrack(
        waitingMedia.getVideoTracks()[0],
        media.getVideoTracks()[0],
        media,
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
  peer,
  showWaiting,
  setShowWaiting,
}: {
  id: ID;
  media: MediaStream | null;
  waitingMedia: MediaStream | null;
  peer: Peer | null;
  showWaiting: boolean;
  setShowWaiting: (b: boolean) => void;
}) {
  return (
    <div className="absolute bottom-0 left-0 flex flex-col justify-between p-8 space-y-4 md:p-16">
      <ShareButton id={id} />
      {!media ? null : <MuteButton media={media} />}
      {!waitingMedia || !media || !peer ? null : (
        <VideoButton
          media={media}
          waitingMedia={waitingMedia}
          peer={peer}
          showWaiting={showWaiting}
          setShowWaiting={setShowWaiting}
        />
      )}
    </div>
  );
}

function Room(props: { signaller: Signaller; call?: ID }) {
  const myVideoRef = React.useRef(null as HTMLVideoElement | null);
  const theirVideoRef = React.useRef(null as HTMLVideoElement | null);
  const waitingVideoRef = React.useRef(null as HTMLVideoElement | null);
  const [myCamera, setMyCamera] = React.useState(null as MediaStream | null);
  const [myWaiting, setMyWaiting] = React.useState(null as MediaStream | null);
  const [connected, setConnected] = React.useState(false);
  const [peer, setPeer] = React.useState(null as Peer | null);
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
    if (!myVideoRef.current) {
      return;
    }
    try {
      const stream = await getWebCamMedia();
      if (!stream) {
        return;
      }
      myVideoRef.current.srcObject = stream;
      setMyCamera(stream);
    } catch (error) {
      console.warn('error setting up video', error);
    }
  };

  React.useEffect(() => {
    setupMyCamera();
  }, [myVideoRef]);

  const setupTheirStream = async () => {
    if (!theirVideoRef.current || !myCamera) {
      return;
    }
    let result: CallResult;
    if (props.call) {
      result = await makeCall(props.call, props.signaller, myCamera);
      console.log('got remote stream after calling');
    } else {
      result = await listen(props.signaller, myCamera);
      console.log('got remote stream after listenning');
    }
    const { peer, stream } = result;
    setPeer(peer);
    const video = theirVideoRef.current;
    if ('srcObject' in video) {
      video.srcObject = stream;
    } else {
      // For older browsers
      (video as any).src = window.URL.createObjectURL(stream);
    }
    setConnected(true);
  };

  React.useEffect(() => {
    setupTheirStream();
  }, [myCamera, theirVideoRef]);

  return (
    <>
      <div
        className={`transition-colors duration-500 w-full h-screen relative ${
          connected ? 'bg-gray-900' : 'bg-main-100'
        }`}
      >
        <video
          autoPlay
          playsInline
          controls={false}
          ref={theirVideoRef}
          className="w-full h-full"
        ></video>
        <div className="absolute top-0 right-0 w-32 mt-8 mb-8 mr-8 rounded-md shadow-lg sm:w-48 lg:w-64 sm:top-auto sm:bottom-0">
          <video
            className={!showWaiting ? 'w-full rounded-md' : 'invisible w-0'}
            autoPlay
            playsInline
            controls={false}
            ref={myVideoRef}
            muted
          ></video>
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
          id={props.call ?? props.signaller.id}
          media={myCamera}
          waitingMedia={myWaiting}
          peer={peer}
          showWaiting={showWaiting}
          setShowWaiting={setShowWaiting}
        />
      </div>
    </>
  );
}

interface Props {
  id: ID;
  created?: boolean;
}

export default function Page({ id, created }: Props) {
  const [signaller, setSignaller] = React.useState(null as Signaller | null);

  React.useEffect(() => {
    if (created) {
      setSignaller(new Signaller(id));
    } else {
      setSignaller(new Signaller());
    }
  }, []);

  if (!signaller) {
    return <p>waiting...</p>;
  } else {
    return <Room signaller={signaller} call={!created ? id : undefined} />;
  }
}

Page.getInitialProps = async (ctx: NextPageContext) => {
  return { id: ctx.query.id, created: ctx.query.created };
};
