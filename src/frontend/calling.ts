import type Signaller from './Signaller';
import type { ID } from '../identifier';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

async function makeCall(to: ID, signaller: Signaller): Promise<RTCPeerConnection> {
  const configuration = { iceServers: ICE_SERVERS };
  const conn = new RTCPeerConnection(configuration);
  const offer = await conn.createOffer();
  await conn.setLocalDescription(offer);
  signaller.send({ data: { offer } }, to);
  signaller.onMessage(async ({ data }) => {
    if (data.answer) {
      const remoteDesc = new RTCSessionDescription(data.answer);
      await conn.setRemoteDescription(remoteDesc);
    }
    if (data.icecandidate) {
      try {
        await conn.addIceCandidate(data.icecandidate);
      } catch (e) {
        console.error('Error adding ice candidate:', e);
      }
    }
  });
  conn.addEventListener('icecandidate', (event) => {
    if (event.candidate) {
      signaller.send({ data: { icecandidate: event.candidate } }, to);
    }
  });
  return new Promise((resolve) => {
    conn.addEventListener('connectionstatechange', (_) => {
      if (conn.connectionState === 'connected') {
        resolve(conn);
      }
    });
  });
}

async function listen(signaller: Signaller): Promise<RTCPeerConnection> {
  const configuration = { iceServers: ICE_SERVERS };
  const conn = new RTCPeerConnection(configuration);
  signaller.onMessage(async ({ from, data }) => {
    if (data.offer) {
      const remoteDesc = new RTCSessionDescription(data.offer);
      conn.setRemoteDescription(remoteDesc);
      const answer = await conn.createAnswer();
      await conn.setLocalDescription(answer);
      signaller.send({ data: { answer } }, from);
    }
  });
  return new Promise((resolve) => {
    conn.addEventListener('connectionstatechange', (_) => {
      if (conn.connectionState === 'connected') {
        resolve(conn);
      }
    });
  });
}