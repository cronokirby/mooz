import { NextPageContext } from 'next';
import React from 'react';
import * as icons from '../../components/icons';
import { listen, makeCall } from '../../src/frontend/calling';
import Signaller from '../../src/frontend/Signaller';
import type { ID } from '../../src/identifier';

interface ButtonProps {
  onClick(): void;
}

function Button(props: React.PropsWithChildren<ButtonProps>) {
  return (
    <button
      className="p-2 rounded-full bg-main-700 hover:bg-main-500 transition-colors duration-500 shadow-lg text-white"
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

function Buttons({ id }: { id: ID }) {
  return (
    <div className="absolute left-0 bottom-0 p-8 md:p-16 flex items-col justify-between space-y-4">
      <ShareButton id={id} />
    </div>
  );
}

function Room(props: { signaller: Signaller; call?: ID }) {
  const myVideoRef = React.useRef(null as HTMLVideoElement | null);
  const theirVideoRef = React.useRef(null as HTMLVideoElement | null);
  const [myStream, setMyStream] = React.useState(null as MediaStream | null);
  const [error, setError] = React.useState('');
  const [connected, setConnected] = React.useState(false);

  const setupMyStream = async () => {
    if (!myVideoRef.current) {
      return;
    }
    try {
      const constraints = { video: true, audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      myVideoRef.current.srcObject = stream;
      setMyStream(stream);
    } catch (error) {
      setError(`Error setting up video: ${error}`);
    }
  };

  React.useEffect(() => {
    setupMyStream();
  }, [myVideoRef]);

  const setupTheirStream = async () => {
    if (!theirVideoRef.current || !myStream) {
      return;
    }
    let remoteStream: MediaStream;
    if (props.call) {
      remoteStream = await makeCall(props.call, props.signaller, myStream);
      console.log('got remote stream after calling');
    } else {
      remoteStream = await listen(props.signaller, myStream);
      console.log('got remote stream after listenning');
    }
    const video = theirVideoRef.current;
    if ('srcObject' in video) {
      video.srcObject = remoteStream;
    } else {
      // For older browsers
      (video as any).src = window.URL.createObjectURL(remoteStream);
    }
    setConnected(true);
  };

  React.useEffect(() => {
    setupTheirStream();
  }, [myStream, theirVideoRef]);

  return (
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
      <div className="rounded-md shadow-lg mt-8 mr-8 mb-8 w-32 sm:w-48 lg:w-64 absolute right-0 top-0 sm:top-auto sm:bottom-0">
        <video
          className="rounded-md w-full"
          autoPlay
          playsInline
          controls={false}
          ref={myVideoRef}
          muted
        ></video>
      </div>
      <Buttons id={props.call ?? props.signaller.id} />
    </div>
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
