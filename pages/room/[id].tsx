import { useRouter } from 'next/router';
import React from 'react';
import { listen, makeCall } from '../../src/frontend/calling';
import Signaller from '../../src/frontend/Signaller';
import type { ID } from '../../src/identifier';
import { NextPageContext } from 'next';

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
    setConnected(true)
  };

  React.useEffect(() => {
    setupTheirStream();
  }, [myStream, theirVideoRef]);

  return (
    <div className={`transition-colors duration-500 w-full h-screen relative ${connected ? 'bg-gray-900' : 'bg-main-100'}`}>
      <video autoPlay playsInline controls={false} ref={theirVideoRef} className="w-full h-full"></video>
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
