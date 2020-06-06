import Head from 'next/head';
import React from 'react';
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

function Home() {
  const [messages, setMessages] = React.useState<any[]>([]);
  const [to, setTo] = React.useState('');
  const [text, setText] = React.useState('');
  const { current: signaller } = React.useRef(new Signaller());

  React.useEffect(
    () => signaller.onMessage((m) => setMessages((ms) => [...ms, m])),
    [],
  );

  const sendMessage = () => {
    signaller.send({ data: text }, to as ID);
  };

  return (
    <>
      <h2>Your ID:</h2>
      <p>{signaller.id}</p>
      <h2>Send a Message To:</h2>
      <input onChange={(e) => setTo(e.target.value)}></input>
      <textarea onChange={(e) => setText(e.target.value)}></textarea>
      <button onClick={sendMessage}>Send</button>
      <h2>Your Messages:</h2>
      <Messages messages={messages} />
    </>
  );
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
