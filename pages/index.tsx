import Head from 'next/head';
import Router from 'next/router';
import React from 'react';
import { newID } from '../src/identifier';

function Home() {
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

  return (
    <>
      <div className="container mx-auto">
        <div className="mx-auto flex flex-col items-center w-11/12 sm:w-8/12 md:w-1/2 lg:w-1/3 bg-white rounded shadow-lg rounded-md my-8 py-4">
          <img className="w-full p-2" src="/bunnyhat.svg">
          </img>
          <button
            onClick={createMeeting}
            className="bg-main-700 transition-colors duration-500 hover:bg-main-500 shadow-md rounded-full focus:shadow text-2xl text-white font-bold px-4 py-2"
          >
            Create Meeting
          </button>
        </div>
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <div>
      <Head>
        <title>Mooz | Cronokirby</title>
      </Head>
      <main className="w-full">
        <Home />
      </main>
    </div>
  );
}
