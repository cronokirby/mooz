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
  };

  React.useEffect(() => {
    setupTheirStream();
  }, [myStream, theirVideoRef]);

  return (
    <>
      <h2>Your Meeting ID:</h2>
      <p>{props.signaller.id}</p>
      <video
        autoPlay
        playsInline
        controls={false}
        ref={myVideoRef}
        muted
      ></video>
      <video autoPlay playsInline controls={false} ref={theirVideoRef}></video>
      <p>{error}</p>
    </>
  );
}

interface Props {
  id: ID;
  created?: boolean;
}

export default function Page({ id, created }: Props) {
  console.log('props', { id, created });
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
  console.log(ctx.query);
  return { id: ctx.query.id, created: ctx.query.created };
};
