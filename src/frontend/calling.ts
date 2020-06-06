import adapter from 'webrtc-adapter';
import type Signaller from './Signaller';
import type { ID } from '../identifier';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478?transport=udp' },
];

function setupConn(
  signaller: Signaller,
  localStream: MediaStream,
  remoteStream: MediaStream,
): RTCPeerConnection {
  const configuration = { iceServers: ICE_SERVERS };
  const conn = new RTCPeerConnection(configuration);
  // 1. Handle new ice candidates
  signaller.onMessage((msg) => {
    if (msg.data.icecandidate) {
      conn.addIceCandidate(msg.data.icecandidate);
    }
  });
  // 2. Add a callback for handling new tracks
  conn.ontrack = (event) => remoteStream.addTrack(event.track);
  // 3. Add all of our local tracks here
  localStream.getTracks().forEach((track) => conn.addTrack(track));
  return conn;
}

export async function makeCall(
  to: ID,
  signaller: Signaller,
  localStream: MediaStream,
  remoteStream: MediaStream,
) {
  const sendMessage = (msg: any) => signaller.send(msg, to);

  const conn = setupConn(signaller, localStream, remoteStream);
  // 4. Create the offer
  const offer = await conn.createOffer();
  // 5. Set the offer as our local description
  await conn.setLocalDescription(offer);
  // 6. Send the offer to the remote peer
  await sendMessage({ data: { offer } });
  // 7. Listen for new ice candidates, inform the remote peer
  conn.onicecandidate = (event) => {
    sendMessage({ data: { icecandidate: event.candidate } });
  };

  signaller.onMessage(async (msg) => {
    if (msg.data.answer) {
      // 13. Receive the answer, set as remote description
      await conn.setRemoteDescription(msg.data.answer);
    }
  });
}

export async function listen(
  signaller: Signaller,
  localStream: MediaStream,
  remoteStream: MediaStream,
) {
  let to: ID | undefined;
  const sendMessage = async (msg: any) => {
    if (to) {
      await signaller.send(msg, to);
    } else {
      console.warn('Lost Message While Listening for peer connection:', msg);
    }
  };

  const conn = setupConn(signaller, localStream, remoteStream);

  signaller.onMessage(async (msg) => {
    if (msg.data.offer) {
      to = msg.from;
      // 8. Receive the offer, set as remote description
      await conn.setRemoteDescription(msg.data.offer);
      // 9. Create the answer
      const answer = await conn.createAnswer();
      // 10. Set answer as local description
      await conn.setLocalDescription(answer);
      // 11. Start our own ice gathering process
      conn.onicecandidate = (event) => {
        sendMessage({ data: { icecandidate: event.candidate } });
      };
      // 12. Send our answer back
      await sendMessage({ data: { answer } });
    }
  });
}
