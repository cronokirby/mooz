import Head from 'next/head';
import React from 'react';
import Signaller from '../src/frontend/Signaller';

function Messages(props: { messages: any[] }) {
  return (
    <ul>
      {props.messages.map((x, i) => (
        <li key={i}>{JSON.stringify(x)}</li>
      ))}
    </ul>
  );
}

function MyRoom(props: { signaller: Signaller }) {
  const myVideoRef = React.useRef(null as HTMLVideoElement | null);
  const [error, setError] = React.useState('');

  const setup = async () => {
    if (!myVideoRef.current) {
      return;
    }
    try {
      const constraints = { video: true, audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      myVideoRef.current.srcObject = stream;
    } catch (error) {
      setError(`Error setting up video: ${error}`);
    }
  };

  React.useEffect(() => {
    setup();
  }, [myVideoRef]);

  return (
    <>
      <h2>Your Meeting ID:</h2>
      <p>{props.signaller.id}</p>
      <video autoPlay playsInline controls={false} ref={myVideoRef} muted></video>
      <p>{error}</p>
    </>
  );
}

function Home() {
  const [signaller, setSignaller] = React.useState<null | Signaller>(null);

  if (signaller) {
    return <MyRoom signaller={signaller} />;
  } else {
    return (
      <>
        <button onClick={() => setSignaller(new Signaller())}>
          Create Meeting
        </button>
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
