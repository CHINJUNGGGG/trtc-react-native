import React, { useState } from "react";
import {
  StyleSheet,
  Button,
  Platform,
  PermissionsAndroid,
  SafeAreaView,
  TextInput,
  View,
  Alert,
} from "react-native";

import TRTCCloud, {
  TRTCCloudDef,
  TRTCCloudListener,
  TRTCParams,
  TXVideoView,
} from "trtc-react-native";

import getLatestUserSig from "./debug/index";
import { SDKAPPID } from "./debug/config";

export default function App() {
  const [meetId, setMeetId] = React.useState("6868");
  const [userId, setUserId] = React.useState("");
  const [isEnter, setIsEnter] = useState(false);
  const [remoteUserId, setRemoteUserId] = useState(false);
  const [remoteVideo, setRemoteVideo] = useState(false);
  const [remoteSub, setRemoteSub] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(false);

  const [roomState, setRoomState] = React.useState({
    remoteUsers: [],
  });

  React.useEffect(() => {
    initInfo();
    return () => {
      console.log("destroy");
      const trtcCloud = TRTCCloud.sharedInstance();
      trtcCloud.unRegisterListener(onRtcListener);
    };
  }, []);

  async function initInfo() {
    if (Platform.OS === "android") {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ]);
    }
    const trtcCloud = TRTCCloud.sharedInstance();
    trtcCloud.registerListener(onRtcListener);
  }

  function onRtcListener(type, params) {
    if (type === TRTCCloudListener.onEnterRoom) {
      console.log("==onEnterRoom");
      if (params.result > 0) {
        setIsEnter(true);
      }
    }
    if (type === TRTCCloudListener.onExitRoom) {
      setIsEnter(false);
      setRemoteUserId(null);
    }
    if (type === TRTCCloudListener.onRemoteUserEnterRoom) {
      setRemoteUserId(params.userId);
    }
    if (type === TRTCCloudListener.onRemoteUserLeaveRoom) {
      setRemoteUserId(null);
    }
    if (type === TRTCCloudListener.onUserVideoAvailable) {
      const { userId, available } = params;
      if (available) {
        setRoomState((oldState) => {
          const index = oldState.remoteUsers.indexOf(userId);
          if (index > -1) return oldState;
          return Object.assign({}, oldState, {
            remoteUsers: [...oldState.remoteUsers, userId],
          });
        });
      } else {
        setRoomState((oldState) => {
          const index = oldState.remoteUsers.indexOf(userId);
          if (index === -1) return oldState;
          oldState.remoteUsers.splice(index, 1);
          return Object.assign({}, oldState);
        });
      }
      setRemoteVideo(params.available);
    }
    if (type === TRTCCloudListener.onUserSubStreamAvailable) {
      setRemoteSub(params.available);
    }
    if (
      type !== TRTCCloudListener.onNetworkQuality &&
      type !== TRTCCloudListener.onStatistics
    ) {
      console.log(type, params);
    }
  }

  const muteMicrophone = () => {
    const trtcCloud = TRTCCloud.sharedInstance();
    if (microphone) {
      trtcCloud.stopLocalAudio(false);
      setMicrophone(false);
    } else {
      trtcCloud.startLocalAudio(TRTCCloudDef.TRTC_AUDIO_QUALITY_SPEECH);
      setMicrophone(true);
    }
  }

  const swCamera = () => {
    const trtcCloud = TRTCCloud.sharedInstance();
    trtcCloud.getDeviceManager();
    if (isFrontCamera) {
      setIsFrontCamera(false);
    } else {
      setIsFrontCamera(true);
    }
    trtcCloud.switchCamera(isFrontCamera);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: 20 }}>
        <TextInput
          style={{ height: 40, borderColor: "gray", borderWidth: 1 }}
          onChangeText={(text) => setMeetId(text)}
          value={meetId}
          placeholder="Please enter room ID"
        />
        <TextInput
          style={{
            height: 40,
            borderColor: "gray",
            borderWidth: 1,
            marginTop: 10,
            marginBottom: 10,
          }}
          onChangeText={(text) => setUserId(text)}
          value={userId}
          placeholder="Please enter user ID"
        />
        <View style={styles.fixToText}>
          <Button
            title="Enter Room"
            onPress={() => {
              if (!SDKAPPID) {
                Alert.alert("Please configure sdkappId information");
                return;
              }
              if (!meetId || !userId) {
                Alert.alert("Please enter room ID and user ID");
                return;
              }
              const userSig = getLatestUserSig(userId).userSig;
              const params = new TRTCParams({
                sdkAppId: SDKAPPID,
                userId,
                userSig,
                roomId: Number(meetId),
              });
              const trtcCloud = TRTCCloud.sharedInstance();
              trtcCloud.enterRoom(
                params,
                TRTCCloudDef.TRTC_APP_SCENE_VIDEOCALL
              );
              trtcCloud.startLocalAudio(TRTCCloudDef.TRTC_AUDIO_QUALITY_SPEECH);

            }}
          />
          <Button
            title="Exit Room"
            onPress={() => {
              const trtcCloud = TRTCCloud.sharedInstance();
              trtcCloud.exitRoom();
            }}
          />
        </View>
        <View style={[styles.fixToText2]}>
          <Button
            title="Mute"
            onPress={() => {
              muteMicrophone();
            }}
          />
          <Button title="S/W Cam" onPress={swCamera} />
        </View>
      </View>
      <View style={{ flex: 1, flexDirection: "row" }}>
        {/* {remoteUserId && remoteSub && (
          <TXVideoView.RemoteView
            userId={remoteUserId}
            viewType={TRTCCloudDef.TRTC_VideoView_SurfaceView}
            streamType={TRTCCloudDef.TRTC_VIDEO_STREAM_TYPE_BIG}
            renderParams={{
              rotation: TRTCCloudDef.TRTC_VIDEO_ROTATION_0,
            }}
            style={{width: '50%', height: '100%'}}
          />
        )}
        {remoteUserId && remoteVideo && (
          <TXVideoView.RemoteView
            userId={remoteUserId}
            viewType={TRTCCloudDef.TRTC_VideoView_SurfaceView}
            streamType={TRTCCloudDef.TRTC_VIDEO_STREAM_TYPE_BIG}
            renderParams={{
              rotation: TRTCCloudDef.TRTC_VIDEO_ROTATION_0,
            }}
            style={{width: '50%', height: '100%'}}
          />
        )} */}

        {roomState.remoteUsers.map((item, index) => (
          <TXVideoView.RemoteView
            userId={item}
            key={`trtc-${index}`}
            viewType={TRTCCloudDef.TRTC_VideoView_SurfaceView}
            streamType={TRTCCloudDef.TRTC_VIDEO_STREAM_TYPE_BIG}
            renderParams={{
              rotation: TRTCCloudDef.TRTC_VIDEO_ROTATION_0,
            }}
            style={{ width: "50%", height: "100%" }}
          />
        ))}
      </View>
      {isEnter && (
        <TXVideoView.LocalView
          style={{ width: "100%", height: "50%" }}
          renderParams={{
            rotation: TRTCCloudDef.TRTC_VIDEO_ROTATION_0,
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixToText: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  fixToText2: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  scrollView: {
    backgroundColor: "white",
    marginHorizontal: 20,
  },
  text: {
    fontSize: 42,
  },
  video: {
    width: 240,
    height: 180,
  },
});
