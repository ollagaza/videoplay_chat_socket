let app = require('express')();
let server = require('http').createServer(app);
let session = require('express-session');
let mongoose = require('mongoose');
let moment = require('moment');
let io = require('socket.io')(server, {
    allowEIO3: true, // false by default,
    cors: {
        origin: "http://localhost:10082",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

mongoose.connect('mongodb://mteg_vas:dpaxldlwl_!@localhost:27017/surgstory');
let db = mongoose.connection;
db.on('error', function(){
    console.log('Connection Failed!');
});
db.once('open', function() {
    console.log('Mongo Connected!');
});

// 채팅스키마
let chat_msg = mongoose.Schema({
    room_name: 'string',
    name: 'string',
    type: 'string',
    comment: 'string',
    chat_time: 'Date',
    chat_timestamp: 'string',
});
let chat_model = mongoose.model('chats', chat_msg);

// 방조인스키마
let join_msg = mongoose.Schema({
    room_name: 'string',
    name: 'string',
    socket_id: 'string',
    join_time: 'Date',
    join_timestamp: 'string',
});
let join_model = mongoose.model('join', join_msg);

//setting cors
app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

app.get('/', function(req, res) {
    res.sendFile('Hello Chating App Server');
});

app.use(session({
    secret: 'ollagaza',
    resave: false,
    saveUninitialized: true
}));
//connection event handler
let clients = 0; // 전체 사용자 수
let numClients = {}; // 룸별 사용자수
const chat_map = {};
let chat = io.of('/chat').on('connection' , function(socket) {
    clients++;
    console.log('Connect from Client: '+socket.id);
    socket.on('room list', function(data) {
        // console.log('io.sockets');
        // console.log(io.sockets.adapter.rooms);
        // console.log('io.of');
        // console.log(io.of("/chat").adapter.rooms);
        // console.log('socket');
        // console.log(socket.adapter.rooms);
        // console.log('socket get');
        // console.log(socket.adapter.rooms.get('11'));
        // console.log('publicRooms');
        // console.log(publicRooms());

        // session.user = [{ 'id' : 'aaa'},{ 'id' : 'bbb'}];
        // // session['id'].abc = 'a';
        // console.log(session.user[1].id);

        if (!session[socket.id]){
            session[socket.id] = {};
        }

        // session[socket.id].user_id = socket.id;
        session[socket.id].conn_time = new Date().getTime();
        // console.log(session[socket.id].user_id)
        console.log(session[socket.id].conn_time)
        // console.log(new Date().getTime());
        // if (!session[socket.handshake.query.uId]){
        //     session[socket.handshake.query.uId] = {};
        // }
        //
        // session[socket.handshake.query.uId].uid = socket.handshake.query.uId;
        // session[socket.handshake.query.uId].ip = ip;
        // session[socket.handshake.query.uId].hostname = socket.handshake.query.hostname;
        // session[socket.handshake.query.uId].sessionid = socket.request.sessionID;
        // session[socket.handshake.query.uId].socketid = socket.id;
        // session[socket.handshake.query.uId].lastchk = util.dateFormat(new Date().getTime());

        // 방정보 가져오기
        let availRooms = [];

        socket.adapter.rooms.forEach((_, key) => {
            console.log(socket.adapter.sids.get(key));
            if(socket.adapter.sids.get(key) === undefined) {
                console.log(socket.adapter.sids.get(key));
                // availRooms.push(key);
                availRooms.push({'room_name': key, 'room_count': numClients[key]});
            }
        })
        console.log('availRooms');
        console.log(availRooms);
        // console.log(socket.adapter.sids);
        // data.roomArray = availRooms;
        // console.log(data.roomArray);

        let rtnMessage = { roomList: availRooms };

        io.of('/chat').emit('room list', rtnMessage); // chat 그룹 전체에 전송.

        console.log('room list');
    });

    socket.on('chat msg', function(data) {
        console.log(`message from Client: ${data.message} / room: ${data.room}`);
        let rtnMessage = { message: data.message, socketId : data.socketId, userName: data.userName, room: data.room };

        // 내용저장부분 Start
        let start = new Date();
        // moment().format('YYYY-MM-DD HH:mm:ss')
        let newChat = new chat_model({ room_name: data.room, name: data.userName, type: 'CHAT', comment: data.message, chat_time: start, chat_timestamp: start.getTime() });

        // 9. 데이터 저장
        newChat.save(function(error, data){
            if(error){
                console.log(error);
            }else{
                console.log('Message Saved!')
            }
        });
        // 내용저장부분 End

        // // 내용삭제부분 Start
        // chat_model.deleteOne({ name: '유동진'}, function(error, data){
        //     if(error){
        //         console.log(error);
        //     }else{
        //         console.log('Message Delete!')
        //     }
        // });
        // // 내용삭제부분 End

        chat.to(data.room).emit('chat msg', rtnMessage);
        // socket.broadcast.emit('chat', rtnMessage);
        console.log('chat msg');
    });

    socket.on('join room', function(data) {
        console.log(`join from Client: room: ${data.room}`);
        socket.join(data.room);
        socket.room = data.room;
        if (numClients[data.room] == undefined) {``
            numClients[data.room] = 1;
        } else {
            numClients[data.room]++;
        }
        // console.log(socket.clients(data.room));
        // Object.assign(chat_map[data.room].users, data.userName);
        // console.log(chat_map[data.room].users);

        // 내용저장부분 Start
        let start = new Date();
        // moment().format('YYYY-MM-DD HH:mm:ss')
        let newJoin = new join_model({ room_name: data.room, name: data.userName, socket_id: socket.id, join_time: start, join_timestamp: start.getTime() });

        // 9. 데이터 저장
        newJoin.save(function(error, data){
            if(error){
                console.log(error);
            }else{
                console.log('Join Saved!')
            }
        });
        // 내용저장부분 End

        let newChat = new chat_model({ room_name: data.room, name: data.userName, type: 'IN', comment: `${data.userName} 님이 입장했습니다.`, chat_time: start, chat_timestamp: start.getTime() });

        // 9. 데이터 저장
        newChat.save(function(error, data){
            if(error){
                console.log(error);
            }else{
                console.log('Message Saved!')
            }
        });
        // 내용저장부분 End


        let rtnMessage = { status: 0, message: '', socketId : data.socketId, clients: numClients[data.room], userName: data.userName, room: data.room };

        let user_info = {
            [data.userName]: {
                user_id: data.userId,
                user_name: data.userName,
            }
        };

        if (!chat_map[data.room]) {
            chat_map[data.room] = {
                room_name: data.room,
                users: {},
                userCount: 0,
            };
        }

        Object.assign(chat_map[data.room].users, user_info);
        chat_map[data.room].userCount = Object.keys(chat_map[data.room].users).length;

        // session[socket.id].user_id = socket.id;
        // session[data.room].conn_time = new Date().getTime();

        chat.to(data.room).emit('join room', rtnMessage);

        console.log(io.of("/chat").adapter.rooms.get(data.room)); // 룸정보
        console.log(io.of("/chat").adapter.rooms.get(data.room)?.size); // 룸 접속자수
        console.log('join room');
    });

    socket.on('getRoomInfo', (data) => {
        let rtn = {};
        console.log('getRoomInfo start');
        console.log('1');
        console.log(data.room);
        console.log(chat_map[data.room]);
        console.log('2');
        if (data && chat_map[data.room]) {
            console.log('3');
            // rtn = {
            //     room_name: chat_map[data.room].room_name,
            //     users: chat_map[data.room].users,
            // }
            console.log('in chat_list');
            chat_model.find({ room_name: data.room}, function(error, chat_list){
                console.log('4');
                console.log('--- Read all ---');
                if(error){
                    console.log(error);
                }else{
                    chat_map[data.room].chat_list= chat_list;
                    console.log(chat_list);
                }
                chat.to(data.room).emit('getRoomInfo', chat_map[data.room]);
            }).sort( { "_id": 1 } )
            console.log('5');


            console.log('6');

            console.log(chat_map[data.room] )
            // console.log(rtn)
            console.log('7');

            console.log('getRoomInfo End ')
        } else {
            if (!chat_map) {
                io.of('/chat').emit('getRoomInfo', {});
            } else {
                io.of('/chat').emit('getRoomInfo', chat_map);

            }
        }
    });

    socket.on('check room', function(data) {
        let rtnMessage = {};
        if (!chat_map[data.room]) {
            rtnMessage = { status: -1, message: '존재하지 않는 방입니다.', userName: data.userName };
        } else {
            rtnMessage = { status: 0, message: 'OK', userName: data.userName };
        }
        socket.join(data.room);
        chat.to(data.room).emit('check room', rtnMessage);
        if (!chat_map[data.room]) {
            socket.leave(data.room);
        }

        console.log(rtnMessage);
        console.log('check room');
    });

    socket.on('leave room', function(data) {
        console.log(`leave from Client: room: ${data.room}`);
        if(data.room) {
            let rtnMessage = {socketId: data.socketId, clients: clients, userName: data.userName, room: data.room};
            socket.leave(data.room);
            if(chat_map[data.room]) {
                numClients[data.room]--;
                let delete_target = {};
                Object.assign(delete_target, chat_map[data.room].users[data.userName]);
                chat.to(data.room).emit('leave room', rtnMessage);
                // console.log(io.sockets.adapter.rooms);
                delete chat_map[data.room].users[data.userName];
                chat_map[data.room].userCount = Object.keys(chat_map[data.room].users).length;
                if (Object.keys(chat_map[data.room].users).length === 0) {
                    delete chat_map[data.room];
                }
            }
        }
        console.log('leave room');
    });

    socket.on('disconnect', function (data) {
        clients--;
        numClients[socket.room]--;
        // console.log(socket.room);
        // console.log(data.userName);
        console.log('disconnect');
    });
})

server.listen(3001, function() {
    console.log('socket io server listening on port 3001')
})
