# Mooz

Simple WebRTC Video Chat

![](https://cronokirby.com/posts/simple-webrtc-video-chat/cover.png)

I encourage you to read the [blog post](https://cronokirby.com/posts/simple-webrtc-video-chat)
that I wrote about this project if you want to learn more.

## Running

After doing an `npm install`, you should be able to run things with `npm run dev`.
One issue that will prevent the app from working fully is that it relies on
[Pusher](https://pusher.com/). You'll need to replace the App ID, key and secret with
your own. These are in `src/frontend/room` and `pages/api/messages/[id]`.
