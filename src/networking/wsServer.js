import uuid from 'node-uuid';

import {APP_INIT} from '../server/store';

export const WS_CLIENT_CONNECTED     = Symbol('teleprint/ws-server/client/connected');
export const WS_CLIENT_DISCONNECTED  = Symbol('teleprint/ws-server/client/disconnected');
export const WS_CLIENT_MESSAGE       = Symbol('teleprint/ws-server/client/message');
export const WS_MESSAGE_SEND         = Symbol('teleprint/ws-server/message-send');
export const WS_MESSAGE_SEND_SUCCESS = Symbol('teleprint/ws-server/message-send/success');
export const WS_MESSAGE_SEND_FAILURE = Symbol('teleprint/ws-server/message-send/failure');
export const WS_DISCONNECT           = Symbol('teleprint/ws-server/disconnect');
export const WS_DISCONNECT_SUCCESS   = Symbol('teleprint/ws-server/disconnect/success');
export const WS_DISCONNECT_FAILURE   = Symbol('teleprint/ws-server/disconnect/failure');

const SOCKETS = {};

export const wsServerMiddleware = store => next => action => {
  next(action);
  switch (action.type) {
    case APP_INIT:
      const {app} = action;
      app.ws.use(function *(next) {
        const socketID = uuid.v1();
        const {websocket} = this;
        SOCKETS[socketID] = websocket;
        store.dispatch(wsClientConnected(socketID));
        websocket.on('message', (message, flags) => {
          store.dispatch(wsClientMessage(socketID, message, flags));
        });
        websocket.on('close', () => {
          store.dispatch(wsClientDisconnected(socketID));
        });
      });
      break;
    case WS_MESSAGE_SEND:
      const {socketID, messageID, message, flags} = action;
      const websocket = SOCKETS[socketID];
      if (!websocket) {
        store.dispatch(wsMessageSendFailure(messageID, new Error(`No websocket with ID ${socketID}`)));
        break;
      }
      websocket.send(message, flags, (error) => {
        if (error) {
          return store.dispatch(wsMessageSendFailure(messageID, error));
        }
        store.dispatch(wsMessageSendSuccess(messageID));
      });
      break;
    case WS_DISCONNECT:
      const {socketID, disconnectRequestID} = action;
      const websocket = SOCKETS[socketID];
      if (!websocket) {
        store.dispatch(wsDisconnectFailure(disconnectRequestID, new Error(`No websocket with ID ${socketID}`)));
        break;
      }
      // According to [the API docs](https://github.com/websockets/ws/blob/master/doc/ws.md#websocketclosecode-data),
      // `websocket.close` does not have a callback. I'm not sure if closing a websocket
      // can throw an error, but it makes sense to try just in case.
      try {
        websocket.close();
        store.dispatch(wsDisconnectSuccess(disconnectRequestID));
      } catch (error) {
        store.dispatch(wsDisconnectFailure(disconnectRequestID, error));
      }
      break;
  }
};

export function wsClientConnected(socketID) {
  return {
    type: WS_CLIENT_CONNECTED,
    socketID
  };
}

export function wsClientDisconnected(socketID) {
  return {
    type: WS_CLIENT_DISCONNECTED,
    socketID
  };
}

export function wsClientMessage(socketID, message, flags) {
  return {
    type: WS_CLIENT_MESSAGE,
    socketID,
    message,
    flags
  };
}

export function wsMessageSend(socketID, message, flags={}) {
  const messageID = uuid.v1();
  return {
    type: WS_MESSAGE_SEND,
    socketID,
    messageID,
    message,
    flags
  };
}

export function wsMessageSendSuccess(messageID) {
  return {
    type: WS_MESSAGE_SEND_SUCCESS,
    messageID
  };
}

export function wsMessageSendFailure(messageID, error) {
  return {
    type: WS_MESSAGE_SEND_FAILURE,
    messageID,
    error
  };
}

export function wsDisconnect(socketID) {
  const disconnectRequestID = uuid.v1();
  return {
    type: WS_DISCONNECT,
    socketID
  };
}

export function wsDisconnectSuccess(disconnectRequestID) {
  return {
    type: WS_DISCONNECT_SUCCESS,
    disconnectRequestID
  };
}

export function wsDisconnectFailure(disconnectRequestID, error) {
  return {
    type: WS_DISCONNECT_FAILURE,
    disconnectRequestID,
    error
  };
}
