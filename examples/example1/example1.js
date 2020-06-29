var channel;
onload = async function(){ // relay.subscribeがpromiseなので、async functionで実行する
	// まずRelayServierオブジェクトをつくる
	var relay = RelayServer("achex", "chirimenRelay" );
	
	// チャンネルをサブスクライブする(Promiseなので await注意)
	channel = await relay.subscribe("example1Channel");
	
	messageDiv.innerText = "connected : achex";
	
	// メッセージを受信したときに起動する関数を登録
	channel.onmessage = getMessage;
}

function getMessage(message){ // メッセージを受信したときに起動する関数
	messageDiv.innerText = message.data;
}

function sendMessage(){ // メッセージを送信する(テキスト)
	channel.send("Hello from "+location.hash+" date:"+new Date()); // テキストを出してみる
}

