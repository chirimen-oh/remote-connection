/**
CHIRIMEN RelayServer.js

This is a common denominator wrapper API for webSocket relay services.
You can exchange data between web clients in real time.
The data should be a string or a stringifyable object.

This implementation is a response to the following issue.
https://github.com/chirimen-oh/chirimen/issues/91

================================================================================
Programmed by Satoru Takagi
Copyright 2020 by Satoru Takagi All Rights Reserved

================================================================================
License: (GPL v3)
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License version 3 as
published by the Free Software Foundation.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.


However, if you want to use the contents of this repository for CHIRIMEN 
community's projects, you can also choose the MIT license.
So, this is a limited dual license for the CHIRIMEN community.

================================================================================
History

2020/06/15 : 1st draft
2020/06/29 : onmessage(cbfunc) -> onmessage=cbfunc(message)
             message.data,.origin,.timeStamp
2021/09/01 : support ESModule and Node.js websocket lib
           for Browsers
             import {RelayServer} from "./RelayServer.js";
             relay = RelayServer("achex", "chirimenSocket" );
           for Node.js
             import WSLib from "websocket";
             import {RelayServer} from "./RelayServer.js";
             relay = RelayServer("achex", "chirimenSocket" , WSLib, "https://chirimen.org");
2021/09/02 : websocketin->piesocket
2021/10/18 : piesocket : RelayServer("[ClusterID].piesocket","[TOKEN]")
2022/10/07 : add tinyWssModule for https://github.com/chirimen-oh/chirimen-web-socket-relay and its heroku deployment (chirimentiny)
================================================================================
WebIDL:

enum ServiceName { "achex", "websocketin" , "websocket.in" , "scaledrone" };

[Exposed=(Window)]
interface RelayServer {
  constructor(ServiceName serviceName, USVString serviceToken, optional object nodeWebSocketLib, optional DOMString OriginURL);
  Promise<Channel> subscribe(optional USVString channelName);
}

interface Channel {
  readonly attribute USVString serverName;
  attribute MessageHandler onmessage;
  void send(USVString or object );
};

callback interface MessageHandler {
  void handleMessage(RSMessage message);
};

interface  RSMessage {
  readonly attribute object data;
  readonly attribute USVString origin;
  readonly attribute USVString timeStamp;
}

**/

function RelayServer(serviceName, serviceToken, nodeWebSocketLib, OriginURL){
	if ( typeof(window)=="undefined"){ // node
		if (typeof(WebSocket)=="undefined"){
			if ( !OriginURL || typeof(nodeWebSocketLib)!="object"){
				throw "nodeWebSocketClass and OriginURL are required.";
			} else {
				initialize4node(nodeWebSocketLib, OriginURL);
			}
		}
	}
	if ( !serviceName || !serviceToken || typeof(serviceToken)!="string"){
		return ( null );
	}
	var serviecs ={
		achex : achexModule,
//		"websocket.in" : websocketInModule,
//		websocketin : websocketInModule,
		piesocket : piesocketModule,
		scaledrone: scaledroneModule,
		wss: tinyWssModule,
		chirimentest: chirimenTest
	}
	var relayService;
	if ( typeof(serviceName)=="string"){
		if ( serviceName.indexOf("wss://")==0){
			relayService = serviecs["wss"](serviceName);
		} else if ( serviceName.lastIndexOf(".")>0){
			var sn = serviceName.toLowerCase();
			var subSn = sn.substring(0,sn.lastIndexOf("."));
			sn = sn.substring(sn.lastIndexOf(".")+1);
			relayService = serviecs[sn](subSn);
		} else {
			relayService = serviecs[(serviceName.toLowerCase())]();
		}
	} else { // 別途規定されたリレーサービスを組み込める？
		relayService = serviceName;
	}
//	console.log("relayService:",relayService);
	
	var defaultChannelName = "chirimenChannel";
	
	function chirimenTest(){
		var wssRelayHost = "wss://chrimen-web-socket-relay.herokuapp.com";
		return ( tinyWssModule(wssRelayHost) );
	}
	
	function tinyWssModule(wssRelayHost ){
		
		function openWSS(wssUrl){
			var socket = new WebSocket(wssUrl);
			return  new Promise( function(okCallback, ngCallback){
				socket.addEventListener('open', function ( event ){
					okCallback(socket)});
			});
		}
		
		async function subscribe(channelName){
			if (!channelName){channelName=defaultChannelName}
			var socket = await openWSS(wssRelayHost + "/" + serviceToken + "/" + channelName);
			console.log("tinyWssModule:channelOpened");
			if ( wssRelayHost.indexOf("herokuapp.com")>0){ // Herokuでは55秒ルールでチャンネルが切れるため・・・
				setTimeout(ping, 45 * 1000);
			}
			function onmessage(cbFunc){
				socket.addEventListener('message', function(event){
//					console.log('message',event);
					var json = JSON.parse(event.data);
					cbFunc( {
						data:json.body,
						timeStamp:event.timeStamp,
						origin:event.origin,
//						lastEventId: event.lastEventId  
					} );
				});
			}
			function send(msg){
//				console.log("sendMsg:",msg,"  typeof(msg)",typeof(msg));
				var outMsg={body:msg};
				outMsg = JSON.stringify(outMsg);
//				console.log("sendMsg:",outMsg);
				socket.send(outMsg);
			}
			function ping() { // Herokuでのコネクション維持用ヌルメッセージ
				socket.send("");
				setTimeout(ping, 45 * 1000);
			}
			return {
				serverName:wssRelayHost,
				set onmessage(cbf){onmessage(cbf)},
				send:send
			}
		}
		return {
			subscribe:subscribe,
		}
	}
	
	function piesocketModule(ClusterID){
		var socket;
		if ( !ClusterID){
			ClusterID = "demo";
		}
		function open(channelName){
//			var channelNumber = crc16(channelName);
			var channelNumber = (channelName);
			socket = new WebSocket('wss://' + ClusterID + '.piesocket.com/v3/' + channelNumber + '?apiKey=' + serviceToken);
			return  new Promise( function(okCallback, ngCallback){
				socket.addEventListener('open', function ( event ){
					okCallback(true)});
			});
		}
		async function subscribe(channelName){
			if (!channelName){channelName=defaultChannelName}
			await open(channelName);
			console.log("piesocketModule:channelOpened");
			function onmessage(cbFunc){
				socket.addEventListener('message', function(event){
//					console.log('message',event);
					var json = JSON.parse(event.data);
					cbFunc( {
						data:json.body,
						timeStamp:event.timeStamp,
						origin:event.origin,
//						lastEventId: event.lastEventId  
					} );
				});
			}
			function send(msg){
//				console.log("sendMsg:",msg,"  typeof(msg)",typeof(msg));
				var outMsg={body:msg};
				outMsg = JSON.stringify(outMsg);
//				console.log("sendMsg:",outMsg);
				socket.send(outMsg);
			}
			return {
				serverName:"websocket.in",
				set onmessage(cbf){onmessage(cbf)},
				send:send
			}
		}
		return {
			subscribe:subscribe,
		}
	}
	
	
	function scaledroneModule(){
		var drone, room;
		var clientId;
		var sdUrl;
		function open(channelName){
			drone = new Scaledrone(serviceToken);
			room = drone.subscribe(channelName);
			return  new Promise( function(okCallback, ngCallback){
				room.on('open', function(error){
					if (error) {
						ngCallback(error);
					}
					clientId = drone.clientId;
					sdUrl = new URL(drone.connection.url);
//					console.log("connected: clientId:",clientId);
					okCallback(true);
				});
			});
		}
		async function subscribe(channelName){
			if (!channelName){channelName=defaultChannelName}
			await open(channelName);
			console.log("scaledroneModule:channelOpened");
			function onmessage(cbFunc){
				room.on('message', function(message){
//					console.log('Received data:', message);
					// 自分が送ったものは返さないようにね
					if ( message.clientId != clientId ){
						cbFunc( {
							data:message.data,
							timeStamp:message.timestamp,
							origin:sdUrl.origin,
//							lastEventId: message.id  
						} );
					}
				});
			}
			function send(msg){
				drone.publish({
					room: channelName,
//					message: {body:msg}
					message: msg
				});
			}
			return {
				serverName:"scaledrone",
				set onmessage(cbf){onmessage(cbf)},
				send:send
			}
		}
		return {
			subscribe:subscribe,
		}
	}
	
	
	function achexModule(){
		var socket;
		var SID; // サービスから割り付けられるセッションID
		var userName="chirimenUser";
		var userPassWord="passs";
		function open(channelName){
			// channelNameをuserNameに割り当てるトリックを使う
			userName = channelName;
			socket = new WebSocket("wss://cloud.achex.ca/"+serviceToken);
			return  new Promise( function(okCallback, ngCallback){
				socket.addEventListener('open', function ( event ){
					socket.send('{"auth":"'+userName+'", "password":"'+userPassWord+'"}');
					okCallback(true)});
			});
		}
		
		async function subscribe(channelName){
			if (!channelName){channelName=defaultChannelName}
			await open(channelName);
			console.log("achexModule:channelOpened");
			function onmessage(cbFunc){
				socket.addEventListener('message', function(event){
//					console.log('message',event);
					const json = JSON.parse(event.data);
					if ( json.auth == "OK"){
						SID=json.SID;
					} else {
//						console.log("json.sID:",json.sID,"  thisSID:",SID);
						if ( json.sID != SID ){ // 自分が投げたものは返答しないことにする
							cbFunc( {
								data:json.msg,
								timeStamp:event.timeStamp,
								origin:event.origin,
//								lastEventId: event.lastEventId
							} );
						}
					}
				});
			}
			function send(msg){
				var outMsg={
					to: userName,
					msg:msg,
				};
				outMsg = JSON.stringify(outMsg);
//				console.log("achexModule to send:",outMsg);
				socket.send(outMsg);
			}
			return {
				serverName:"achex",
				set onmessage(cbf){onmessage(cbf)},
				send:send
			}
		}
//		await open();
		
		return {
//			open:open,
			subscribe:subscribe,
		}
	}
	
	
	return {
		subscribe:relayService.subscribe,
	}
}

// websocketInModuleのチャンネルが文字列でなく数字なので一応・・・
// https://github.com/donvercety/node-crc16/
function crc16(str){
	const crctab16 = new Uint16Array([
		0X0000, 0X1189, 0X2312, 0X329B, 0X4624, 0X57AD, 0X6536, 0X74BF,
		0X8C48, 0X9DC1, 0XAF5A, 0XBED3, 0XCA6C, 0XDBE5, 0XE97E, 0XF8F7,
		0X1081, 0X0108, 0X3393, 0X221A, 0X56A5, 0X472C, 0X75B7, 0X643E,
		0X9CC9, 0X8D40, 0XBFDB, 0XAE52, 0XDAED, 0XCB64, 0XF9FF, 0XE876,
		0X2102, 0X308B, 0X0210, 0X1399, 0X6726, 0X76AF, 0X4434, 0X55BD,
		0XAD4A, 0XBCC3, 0X8E58, 0X9FD1, 0XEB6E, 0XFAE7, 0XC87C, 0XD9F5,
		0X3183, 0X200A, 0X1291, 0X0318, 0X77A7, 0X662E, 0X54B5, 0X453C,
		0XBDCB, 0XAC42, 0X9ED9, 0X8F50, 0XFBEF, 0XEA66, 0XD8FD, 0XC974,
		0X4204, 0X538D, 0X6116, 0X709F, 0X0420, 0X15A9, 0X2732, 0X36BB,
		0XCE4C, 0XDFC5, 0XED5E, 0XFCD7, 0X8868, 0X99E1, 0XAB7A, 0XBAF3,
		0X5285, 0X430C, 0X7197, 0X601E, 0X14A1, 0X0528, 0X37B3, 0X263A,
		0XDECD, 0XCF44, 0XFDDF, 0XEC56, 0X98E9, 0X8960, 0XBBFB, 0XAA72,
		0X6306, 0X728F, 0X4014, 0X519D, 0X2522, 0X34AB, 0X0630, 0X17B9,
		0XEF4E, 0XFEC7, 0XCC5C, 0XDDD5, 0XA96A, 0XB8E3, 0X8A78, 0X9BF1,
		0X7387, 0X620E, 0X5095, 0X411C, 0X35A3, 0X242A, 0X16B1, 0X0738,
		0XFFCF, 0XEE46, 0XDCDD, 0XCD54, 0XB9EB, 0XA862, 0X9AF9, 0X8B70,
		0X8408, 0X9581, 0XA71A, 0XB693, 0XC22C, 0XD3A5, 0XE13E, 0XF0B7,
		0X0840, 0X19C9, 0X2B52, 0X3ADB, 0X4E64, 0X5FED, 0X6D76, 0X7CFF,
		0X9489, 0X8500, 0XB79B, 0XA612, 0XD2AD, 0XC324, 0XF1BF, 0XE036,
		0X18C1, 0X0948, 0X3BD3, 0X2A5A, 0X5EE5, 0X4F6C, 0X7DF7, 0X6C7E,
		0XA50A, 0XB483, 0X8618, 0X9791, 0XE32E, 0XF2A7, 0XC03C, 0XD1B5,
		0X2942, 0X38CB, 0X0A50, 0X1BD9, 0X6F66, 0X7EEF, 0X4C74, 0X5DFD,
		0XB58B, 0XA402, 0X9699, 0X8710, 0XF3AF, 0XE226, 0XD0BD, 0XC134,
		0X39C3, 0X284A, 0X1AD1, 0X0B58, 0X7FE7, 0X6E6E, 0X5CF5, 0X4D7C,
		0XC60C, 0XD785, 0XE51E, 0XF497, 0X8028, 0X91A1, 0XA33A, 0XB2B3,
		0X4A44, 0X5BCD, 0X6956, 0X78DF, 0X0C60, 0X1DE9, 0X2F72, 0X3EFB,
		0XD68D, 0XC704, 0XF59F, 0XE416, 0X90A9, 0X8120, 0XB3BB, 0XA232,
		0X5AC5, 0X4B4C, 0X79D7, 0X685E, 0X1CE1, 0X0D68, 0X3FF3, 0X2E7A,
		0XE70E, 0XF687, 0XC41C, 0XD595, 0XA12A, 0XB0A3, 0X8238, 0X93B1,
		0X6B46, 0X7ACF, 0X4854, 0X59DD, 0X2D62, 0X3CEB, 0X0E70, 0X1FF9,
		0XF78F, 0XE606, 0XD49D, 0XC514, 0XB1AB, 0XA022, 0X92B9, 0X8330,
		0X7BC7, 0X6A4E, 0X58D5, 0X495C, 0X3DE3, 0X2C6A, 0X1EF1, 0X0F78,
	]);

	// calculate the 16-bit CRC of data with predetermined length.
	function _crc16(data) {
		var res = 0x0ffff;
		for (let b of data) {
			res = ((res >> 8) & 0x0ff) ^ crctab16[(res ^ b) & 0xff];
		}
		return (~res) & 0x0ffff;
	}
	return (_crc16(new TextEncoder().encode(str)))
}

function initialize4node(nodeWebSocketLib,OriginURL){
	console.log(typeof(nodeWebSocketLib),OriginURL);
	if ( !OriginURL || typeof(nodeWebSocketLib)!="object"){
		throw "nodeWebSocketClass and OriginURL are required.";
	}
	var nodeWebSocketClass = nodeWebSocketLib.w3cwebsocket;
	class WebSocket extends nodeWebSocketClass{
		constructor(url) {
			console.log(url,null,OriginURL);
			super(url,null,OriginURL); // OriginURLがないと、achex wssは接続失敗する
		}
	}
	
	global.WebSocket=WebSocket;
}

export { crc16, RelayServer, initialize4node};