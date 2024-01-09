"use strict"; // Module

// モジュール
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

// Đối tượng
const app = express();
const server = http.Server(app);

// const fs = require('fs');
// const server = require('https').createServer({
//     key: fs.readFileSync('./privatekey.pem'),
//     cert: fs.readFileSync('./cert.pem'),
// }, app)


const io = socketIO(server);

// Hằng số
const PORT = process.env.PORT || 1337;

// Xử lý khi kết nối
// ・Khi kết nối giữa máy chủ và máy khách được thiết lập,
// ở phía máy chủ, sự kiện "connection" xảy ra
// ở phía máy khách, sự kiện "connect" xảy ra
io.on("connection", (socket) => {
    console.log("connection : ", socket.id);
    socket.data.connected = false;
    socket.data.available = false;

    // Xử lý khi mất kết nối
    // ・Khi máy khách mất kết nối, ở phía máy chủ, sự kiện "disconnect" sẽ xảy ra
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

    // Xử lý khi nhận dữ liệu signaling
    // ・Xử lý đối với dữ liệu signaling được gửi từ máy khách bằng cách sử dụng "socket.emit( "signaling", objData );" từ phía máy khách.
    socket.on("signaling", (objData) => {
        console.log("signaling : ", socket.id);
        console.log("- type : ", objData.type);

        // Gửi đến đối tác được chỉ định
        if ("to" in objData) {
            socket.data.connected = true;
            console.log("- to : ", objData.to);
            // Gửi dữ liệu kèm theo SocketID nguồn đến đối tác được chỉ định
            objData.from = socket.id;
            socket.to(objData.to).emit("signaling", objData);
        } else {
            console.error("Unexpected : Unknown destination");
        }
    });

    // Xử lý khi tham gia cuộc trò chuyện video
    socket.on("join", async (objData) => {
        await join(socket);
    });

    // Xử lý khi rời khỏi cuộc trò chuyện video
    socket.on("leave", async (objData) => {
        console.log("leave : ", socket.id);
        let strRoomName;
        if (socket.data.strRoomName) {
            console.log("- Room name = ", socket.data.strRoomName);
            strRoomName = socket.data.strRoomName;
            // Xử lý rời khỏi phòng
            socket.leave(socket.data.strRoomName);
            // Xóa tên phòng từ đối tượng socket
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

// Chỉ định thư mục công khai
app.use(express.static(__dirname + "/public"));

// Khởi động máy chủ
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

    // Bỏ tìm kiếm người chờ phòng, luôn lấy người ở cuối trong danh sách các users

    // for (let i = 0; i < users.length; i++) {
    //     const user = users[i];
    //     if ( user.data.available == true && user.data.connected == false && user.id != socket.id && socket.data.viewedId != user.id) {
    //         console.log('ndma,sndmasndmand,amdn,mandasmd')
    //         wattingUser = user;
    //         socket.data.viewedId = wattingUser.id;
    //         socket.data.connected = true;

    //         wattingUser.data.viewedId = socket.id;
    //         wattingUser.data.connected = true;

    //         break;
    //     }
    // }

    const user = users[users.length - 1];
    wattingUser = user;
    socket.data.viewedId = wattingUser.id;
    socket.data.connected = true;

    wattingUser.data.viewedId = socket.id;
    wattingUser.data.connected = true;

    // Tìm kiếm người đang chờ trong phòng nào đó
    // nếu không có ai thì tự tạo 1 cái random name cho phòng
    strRoomName = wattingUser ? wattingUser.data.strRoomName : Math.random().toString();

    console.log("- Room name = ", strRoomName);

    // Tham gia phòng
    socket.join(strRoomName);
    // Thêm tên phòng vào thành viên của đối tượng socket
    socket.data.strRoomName = strRoomName;

    // Gửi "join" cho tất cả mọi người trong phòng trừ người gửi
    // Gửi kèm theo SocketID nguồn trong dữ liệu gửi và gửi cho tất cả mọi người trong phòng trừ người gửi.
    socket.broadcast
        .to(strRoomName)
        .emit("signaling", { from: socket.id, type: "join" });
};
