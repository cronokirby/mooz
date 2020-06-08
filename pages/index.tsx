import Head from 'next/head';
import React from 'react';
import { listen, makeCall } from '../src/frontend/calling';
import Signaller from '../src/frontend/Signaller';
import { ID, newID } from '../src/identifier';
import Router from 'next/router';

function Home() {
  const [inp, setInp] = React.useState('');

  const createMeeting = () => {
    const id = newID();
    Router.push(
      {
        pathname: `/room/[id]`,
        query: { id, created: true },
      },
      `/room/${id}`,
    );
  };

  const joinMeeting = () => {
    Router.push('/room/[id]', `/room/${inp}`);
  };

  return (
    <>
      <button onClick={createMeeting}>Create Meeting</button>
      <input
        onChange={(e) => setInp(e.target.value)}
        placeholder="meeting ID"
      ></input>
      <button onClick={joinMeeting}>Join Meeting</button>
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
