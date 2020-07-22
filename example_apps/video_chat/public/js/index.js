const socketClient = new WebSocket("ws://localhost:3001")
let peerConnection = new RTCPeerConnection()
let isAlreadyCalling = false

function resetPeerConnection () {
  peerConnection = new RTCPeerConnection()
}

/**
 * @method handleRoom
 *
 * @description
 * Handles the event/callback of the `room` message.
 * Updates the UI, such as the user ids. The `room` event is sent each time a user joins or leaves
 *
 * @param {object}      data        Data sent back from the socket server
 * @param {string}      data.myId   Your socket id
 * @param {string[]}    data.users  List of other users in the room. Empty is no other users
 * @param {string}      data.name   Name of the socket room you're in
 *
 */
function handleRoom(data) {
  // Check the id elem text to see if a user was on the page
  const callUserElement = document.getElementById('call-user')
  const theirId = callUserElement.dataset.socketId
  // If they have left e.g. no users, remove the src object
  if (theirId && !data.users.length) {
    console.log('User has left the room')
    const peerVideoElement = document.querySelector('video#peer-video')
    peerVideoElement.srcObject = null
    const endCallElement = document.getElementById('end-call')
    callUserElement.classList.remove('hide')
    endCallElement.classList.add('hide')
  }
  if (!theirId && data.users.length) {
    console.log('User has joined the room')
  }
  callUserElement.textContent = data.users[0] ? 'Call User!' : 'Waiting for a friend...'
  callUserElement.dataset.socketId = data.users[0]
}

/**
 * @method callUser
 *
 * @description
 * Make a WebRTC call to a user using their socket id, and send it through the socket server
 *
 * @param {string} socketId The other persons socket id
 */
function callUser(socketId) {
  peerConnection.createOffer().then((offer) => {
    return peerConnection.setLocalDescription(new RTCSessionDescription(offer))
  }).then(() => {
    const data = {
      send_message: {
        to: "call-user",
        message: {
          offer: peerConnection.localDescription,
          to: socketId
        }
      }
    }
    socketClient.send(JSON.stringify(data))
  })
}

/**
 * @method handleCallMade
 *
 * @description
 * Handle the event for `call-made` from the socket. Answer the call
 *
 * @param {object}  data        The data passed back from the event
 * @param {any}     data.offer  The offer for the call
 * @param {string}  data.socket Socket id trying to call
 */
async function handleCallMade(data) {
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(data.offer)
  );
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(answer));
  const dataToSend = {
    send_message: {
      to: "make-answer",
      message: {
        answer,
        to: data.socket
      }
    }
  }
  socketClient.send(JSON.stringify(dataToSend))
}

/**
 * @method handleAnswerMade
 *
 * @description
 * Handler for socket event of `answer-made`. Calls the user
 *
 * @param {object}  data            The data passed back from the event
 * @param {any}     data.answer     The answer object for the call
 * @param {string}  data.socket     Socket id trying to call
 */
async function handleAnswerMade(data) {
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(data.answer)
  );
  if (!isAlreadyCalling) {
    callUser(data.socket);
    isAlreadyCalling = true;
  }
  isAlreadyCalling = false
}

/**
 * @method displayMyVideoAndGetTracks
 *
 * @description
 * Display the users video and add the tracks to the peer connection
 */
function displayMyVideoAndGetTracks() {
  // Display stream and set tracks
  navigator.getUserMedia(
    {video: true, audio: true},
    stream => {
      const localVideo = document.getElementById("user-video");
      console.log(localVideo)
      if (localVideo) {
        localVideo.srcObject = stream;
      }

      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    },
    error => {
      console.warn(error.message);
    }
  );
}

window.addEventListener("DOMContentLoaded", function () {

  // Must be first
  displayMyVideoAndGetTracks()

  // Listen for peer connections
  peerConnection.ontrack = function ({streams: [stream]}) {
    const remoteVideo = document.getElementById("peer-video");
    if (remoteVideo) {
      remoteVideo.srcObject = stream;
      const callUserElement = document.getElementById('call-user')
      const endCallElement = document.getElementById('end-call')
      callUserElement.classList.add('hide')
      endCallElement.classList.remove('hide')
    }
  };

  peerConnection.oniceconnectionstatechange = function (data) {
    if (peerConnection.iceConnectionState === "failed" ||
      peerConnection.iceConnectionState === "disconnected" ||
      peerConnection.iceConnectionState === "closed") {
      const peerVideo = document.querySelector('video#peer-video')
      peerVideo.srcObject = null
    }
  }

  setTimeout(() => {
    socketClient.send(JSON.stringify({ send_message: { to: "room", message: "" }}))
  }, 2000)

  socketClient.addEventListener("message", async (data) => {
    const event = data.event
    if (event === "room") {
      handleRoom(data)
    }
    if (event === "call-made") {
      await handleAnswerMade(data)
    }
    if (event === "answer-made") {
      await handleAnswerMade(data)
    }
  })

  document.getElementById('call-user').addEventListener('click', function (event) {
    const callUserElement = document.getElementById('call-user')
    const id = callUserElement.dataset.socketId
    if (!id)
      return false
    callUser(id)
  })

  document.getElementById('end-call').addEventListener('click', function () {
    peerConnection.close()
  })

})