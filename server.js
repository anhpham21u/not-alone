"use strict"; // 厳格モードとする

// モジュール
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

// オブジェクト
const app = express();
const server = http.Server(app);
const io = socketIO(server);

// 定数
const PORT = process.env.PORT || 1337;

// 接続時の処理
// ・サーバーとクライアントの接続が確立すると、
// 　サーバー側で、"connection"イベント
// 　クライアント側で、"connect"イベントが発生する
io.on("connection", (socket) => {
    console.log("connection : ", socket.id);
    socket.data.connected = false;
    socket.data.available = false;

    // 切断時の処理
    // ・クライアントが切断したら、サーバー側では"disconnect"イベントが発生する
    socket.on("disconnect", async () => {
        console.log("disconnect : ", socket.id);

        let strRoomName;
        if (socket.data.strRoomName) {
            console.log("- Room name = ", socket.data.strRoomName);
            strRoomName = socket.data.strRoomName;
            socket.data.connected = false;
            socket.data.available = false;
        
            const users = await io.in(strRoomName).fetchSockets();
            if (users[0]) {
                users[0].leave(strRoomName);
                users[0].data.strRoomName = "";
                await join(users[0]);
            }
        }

    });

    // signalingデータ受信時の処理
    // ・クライアント側のsignalingデータ送信「socket.emit( "signaling", objData );」に対する処理
    socket.on("signaling", (objData) => {
        console.log("signaling : ", socket.id);
        console.log("- type : ", objData.type);

        // 指定の相手に送信
        if ("to" in objData) {
            socket.data.connected = true;
            console.log("- to : ", objData.to);
            // 送信元SocketIDを送信データに付与し、指定の相手に送信
            objData.from = socket.id;
            socket.to(objData.to).emit("signaling", objData);
        } else {
            console.error("Unexpected : Unknown destination");
        }
    });

    // ビデオチャット参加時の処理
    socket.on("join", async (objData) => {
        await join(socket);
    });

    // ビデオチャット離脱時の処理
    socket.on("leave", async (objData) => {
        console.log("leave : ", socket.id);
        let strRoomName;
        if (socket.data.strRoomName) {
            console.log("- Room name = ", socket.data.strRoomName);
            strRoomName = socket.data.strRoomName;
            // ルームからの退室
            socket.leave(socket.data.strRoomName);
            // socketオブジェクトのルーム名のクリア
            socket.data.strRoomName = "";
            socket.data.connected = false;
            socket.data.available = false;

            const users = await io.in(strRoomName).fetchSockets();
            console.log(users.length);
            if (users[0]) {
                users[0].leave(strRoomName);
                users[0].data.strRoomName = "";
                await join(users[0]);
            }
        }

        socket.emit("leave", "");
    });
});

// 公開フォルダの指定
app.use(express.static(__dirname + "/public"));

// サーバーの起動
server.listen(PORT, () => {
    console.log("Server on port %d", PORT);
});

const join = async (socket) => {
    console.log("join : ", socket.id);
    socket.data.connected = false;
    socket.data.available = true;
    // find watting user

    let users = await io.fetchSockets();
    let wattingUser;
    let strRoomName;

    console.log(users.length)
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        if ( user.data.available == true && user.data.connected == false && user.id != socket.id && socket.data.viewedId != user.id) {
            wattingUser = user;
            socket.data.viewedId = wattingUser.id;
            socket.data.connected = true;

            wattingUser.data.viewedId = socket.id;
            wattingUser.data.connected = true;

            break;
        }
    }

    if (wattingUser) {
        // found wattingUser
        if (wattingUser.data.strRoomName) {
            // found wattingUser have room
            strRoomName = wattingUser.data.strRoomName;
        } else {
            // found wattingUser have not room
            // impossiable
        }
    } else {
        // not found wattingUser
        strRoomName = Math.random().toString();
    }

    console.log("- Room name = ", strRoomName);

    // ルームへの入室
    socket.join(strRoomName);
    // ルーム名をsocketオブジェクトのメンバーに追加
    socket.data.strRoomName = strRoomName;

    // 「join」を同じルームの送信元以外の全員に送信
    // 送信元SocketIDを送信データに付与し、同じルームの送信元以外の全員に送信
    socket.broadcast
        .to(strRoomName)
        .emit("signaling", { from: socket.id, type: "join" });
};
