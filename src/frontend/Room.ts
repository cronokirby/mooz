import Pusher from 'pusher-js';
import Peer from 'simple-peer';
import type { ID } from '../identifier';

/**
 * Represents the type of message we can send in our protocol.
 */
type Message =
  // In this case some user wants to join the room, and as the host, we'll
  // tell them who they need to send call messages to
  | { type: 'joinroom'; from: ID }
  // This is our reply to someone joining a room
  | { type: 'roomreply'; from: ID; shouldCall: ID[] }
  // A user is trying to establish a connection with us, and we "respond"
  // by creating a simple peer connection with them, acting as the initiator of a WebRTC call
  | { type: 'call'; from: ID }
  // This is used to forward signalling data from the underlying WebRTC protocol
  | { type: 'signal'; from: ID; data: any };

let pusher: Pusher | undefined;
function getPusherInstance(): Pusher {
  if (!pusher) {
    pusher = new Pusher('6571d8c516428778fa06', { cluster: 'eu' });
  }
  return pusher;
}

/**
 * Listen to incoming messages directed towards this ID, and handle them with a callback
 *
 * @param to the ID to listen for
 * @param cb the function to call when messages arrive
 */
function listen(to: ID, cb: (msg: Message) => void) {
  const pusher = getPusherInstance();
  const channel = pusher.subscribe(to);
  // We could do validation here, but oh well
  channel.bind('signal', (msg: any) => {
    console.log('received', msg);
    cb(msg);
  });
}

async function postData(url: string, data: any) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Send a message to some identifier
 *
 * @param message the message to send
 * @param to the identifier of the person to send the message to
 */
async function send(message: Message, to: ID) {
  console.log('sending', message, to);
  await postData(`/api/messages/${to}`, message);
}

type OnCallCB = (stream: MediaStream) => void;

/**
 * Represents a Room where can we join multiple video calls between different people.
 *
 * In practice this represents a mesh architecture, where each peer is connected to
 * each other peer. The interface abstracts all of that away. The room just lets us
 * know when new video streams arrive.
 */
export default class Room {
  /**
   * This joins an existing room, that we don't own
   *
   * @param myID the identifier we have
   * @param roomID the room we're joining
   * @param stream our media stream to send to the other users
   * @param cb what to do when new streams arrive
   */
  static join(myID: ID, roomID: ID, stream: MediaStream, cb: OnCallCB) {
    const room = new Room(myID, roomID, stream, cb);
    send({ type: 'joinroom', from: myID }, roomID);
    return room;
  }

  /**
   * Create a new room and act as the host
   *
   * @param myID our ID, and the room ID as well
   * @param stream the media stream we'll send to other users
   * @param cb what to do when new streams arrive
   */
  static host(myID: ID, stream: MediaStream, cb: OnCallCB) {
    const room = new Room(myID, myID, stream, cb);
    return room;
  }

  private readonly cb: OnCallCB;
  private readonly myID: ID;
  private readonly roomID: ID;
  private readonly myStream: MediaStream;
  private readonly peers: Map<ID, Peer.Instance>;

  private constructor(myID: ID, roomID: ID, stream: MediaStream, cb: OnCallCB) {
    this.myID = myID;
    this.roomID = roomID;
    this.cb = cb;
    this.myStream = stream;
    this.peers = new Map();
    listen(myID, (msg) => {
      if (msg.type === 'signal') {
        this.onSignal(msg.from, msg.data);
      } else if (msg.type === 'joinroom') {
        this.onJoinRoom(msg.from);
      } else if (msg.type === 'call') {
        this.onCall(msg.from);
      } else if (msg.type === 'roomreply') {
        this.onRoomReply(msg.from, msg.shouldCall);
      }
    });
  }

  private onSignal(from: ID, data: any) {
    const peer = this.peers.get(from);
    if (peer) {
      peer.signal(data);
    }
  }

  private onJoinRoom(from: ID) {
    send(
      {
        type: 'roomreply',
        from: this.myID,
        shouldCall: [this.myID, ...this.peers.keys()],
      },
      from,
    );
  }

  private onRoomReply(from: ID, shouldCall: ID[]) {
    if (from !== this.roomID) {
      return;
    }
    for (const id of shouldCall) {
      this.call(id);
    }
  }

  private onCall(from: ID) {
    const peer = new Peer({ initiator: true, stream: this.myStream });
    peer.on('signal', (data) =>
      send({ type: 'signal', from: this.myID, data }, from),
    );
    peer.on('stream', this.cb);
    this.peers.set(from, peer);
  }

  private call(id: ID) {
    const peer = new Peer({ stream: this.myStream });
    peer.on('signal', (data) =>
      send({ type: 'signal', from: this.myID, data }, id),
    );
    peer.on('stream', this.cb);
    this.peers.set(id, peer);
    send({ type: 'call', from: this.myID }, id);
  }

  /**
   * Replace the current track we're streaming with a new track
   *
   * This allows us to replace the video feed, for example.
   *
   * @param oldTrack the old track
   * @param newTrack the new track
   */
  replaceTrack(oldTrack: MediaStreamTrack, newTrack: MediaStreamTrack) {
    for (const peer of this.peers.values()) {
      peer.replaceTrack(oldTrack, newTrack, this.myStream);
    }
  }
}
