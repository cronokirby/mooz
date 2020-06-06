import Head from 'next/head';
import React from 'react';
import { listen, makeCall } from '../src/frontend/calling';
import Signaller from '../src/frontend/Signaller';
import type { ID } from '../src/identifier';

function Messages(props: { messages: any[] }) {
  return (
    <ul>
      {props.messages.map((x, i) => (
        <li key={i}>{JSON.stringify(x)}</li>
      ))}
    </ul>
  );
}

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
    let conn: RTCPeerConnection;
    if (props.call) {
      conn = await makeCall(props.call, props.signaller);
    } else {
      conn = await listen(props.signaller);
    }
    myStream.getTracks().forEach((track) => conn.addTrack(track, myStream));
    const remoteStream = new MediaStream();
    theirVideoRef.current.srcObject = remoteStream;
    conn.addEventListener('track', (event) =>
      remoteStream.addTrack(event.track),
    );
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

function Home() {
  const { current: signaller } = React.useRef(new Signaller());
  const [typ, setTyp] = React.useState('notjoined');
  const [inp, setInp] = React.useState('');

  if (typ === 'created') {
    return <Room signaller={signaller} call={undefined} />;
  } else if (typ === 'joined') {
    return <Room signaller={signaller} call={inp as ID} />;
  } else {
    return (
      <>
        <button onClick={() => setTyp('created')}>Create Meeting</button>
        <input
          onChange={(e) => setInp(e.target.value)}
          placeholder="meeting ID"
        ></input>
        <button onClick={() => setTyp('joined')}>Join Meeting</button>
      </>
    );
  }
}

export default function HomePage() {
  return (
    <div>
      <Head>
        <title>Mooz | Cronokirby</title>
      </Head>
      <main>
        <Home />
      </main>
    </div>
  );
}
