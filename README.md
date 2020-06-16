## 概要

さまざまなwebSocketリレーサービスを使用して、CHIRIMENデバイスを含むwebAppsを接続して連携可能にする、簡単に使えるライブラリです。

CHIRIMENチュートリアル受講者を想定し、作法をなるべくそれに合わせ機能を絞った平易なものになっています。またユーザの状況に合わせ、APIは共通のまま複数のwebSocketリレーサービスから使用するサービスを選択できます。

## ためしてみる
- [Example](examples/example1.html) 

## ライブラリ
- [ライブラリ(RelayServer.js)はこちら](polyfill/RelayServer.js)

## 構成

![構成図](imgs/relay.png "構成図")

上の構成図でRelayServer.jsの役割を示します。

- サービスごとの仕様の差異を吸収し、一つのAPIで利用可能にする
- CHIRIMEN教材のためのデバイス間連携に用途を絞り、APIを簡略化する
- CHIRIMEN教材とプログラミング作法をあわせ、コールバック処理を削減しAsync/Await処理にする
- 簡易な学習・プロトタイピングを主眼とするため、セキュリティに関する特別な考慮は行っていない

## 使用方法

#### ライブラリを読み込む
```html
<script src="https://chirimen.org/remote-connection/polyfill/RelayServer.js"></script>
````

*Note: scaledroneを使用するときには追加のライブラリ読み込みが必要(後述)*

#### 初期化Step1: リレーサービスインスタンスを取得する
```javascript
var relay = RelayServer("achex", "chirimenSocket" ); 
```

ここで、"achex"は利用できるサービスの一つの名称、"chirimenSocket"はそのサービスを利用するためのトークン(achexの場合、任意の文字列)です。
図のように、トークンごとに別のスペースが作られます。
他のサービスの利用方法については後述。

#### 初期化Step2: チャンネルを取得する
```javascript
var channel = await relay.subscribe("chirimenLED");
```

"chirimenLED"がチャンネル名(任意の文字列)です。

- チャンネルは図のようにトークンでつくられたスペースの中にいくつもつくることができます。
- 同じチャンネルには複数のWebAppsが接続できます。（接続できる個数はサービスごとに異なるようですが、少なくとも数個は接続できます）
- チャンネルに接続したWebAppsの一つがメッセージを送信すると、同じチャンネルに接続している他のWebApps全てがそれを受信します。

subscribe()は非同期関数のためawait接頭詞を忘れずに。初期化ステップはasync関数内で実行すると良いでしょう。


#### 初期化Step3: メッセージ受信ハンドラを設定する
```javascript
channel.onMessage(getMessage);

function getMessage(messageData){
    console.log(messageData);
}
```

onMessageの引数で指定した関数の第一引数にメッセージが送られます。メッセージは文字列もしくは任意のオブジェクトです。（次項参照）

初期化は以上で完了です。

#### メッセージの送信
一旦初期化が完了すれば、メッセージの送受信ができるようになります。
メッセージの送信手順は以下です。
```javascript
channel.sendMessage("Hello Remote Device");
```
メッセージとしてオブジェクトも受け付けられます。
```javascript
channel.sendMessage({temperature:24, humidity:60});
```

## サービスごとの利用方法

サービスごとに違いがあるのは、最初のRelayServierインスタンスの取得部分のみです。
```javascript
RelayServer("serverName", "serviceToken" )
```
*なおscaledroneでは別途専用ライブラリの読み込みが必要*

### serverName

serverNameには以下の文字列
- ```achex``` ： [Achex](https://achex.ca/)を使います。
- ```websocket.in``` もしくは ```websocketin``` ： [WebSocket.IN](https://www.websocket.in/)を使います。
- ```scaledrone``` ： [scaledrone](https://www.scaledrone.com/)を使います。

### serviceToken

サービスごとにserviceTokenの設定方法が異なります。また、サービスごとに用語の定義が異なります。

#### Achex

Achexでは任意の文字列が指定できます。特にサービスへのアカウント登録手続きやトークンの申請手続きなどは不要です。

#### WebSocket .IN

WebSocket.INでは、RelayServer.jsにおけるServiceTokenのことを、API Keyと呼んでいます。

API Keyの取得

- [WebSocket.IN](https://www.websocket.in/)で、無料アカウントを作成します
- [WebSocket.INのダッシュボード](https://www.websocket.in/settings/api)で、API Keyを作ります。(CREATE NEW KEY)ボタン
  - Key Nameは任意の文字列を入力します。
  - API Key(ServiceToken)は〇にiのアイコンを押すと出現する**60文字ぐらいのランダムな文字列**です。
  - API Ket Settings(ギヤのアイコン)で、ドメインを登録すると、そのドメインのコンテンツのみからのアクセスだけを許可することができ、少しセキュリティを高められます。

*Note: WebSocket.INで、チャンネル名は数値のみ許されます。そこでRelayServer.jsでは任意の文字列をCRC16を用いて数値に変換することで差異を吸収しています。*

#### scaledrone

scaledroneでは、
- RelayServer.jsにおける「ServiceToken毎に作られるスペース」のことを「CHANNEL」、　
- RelayServer.jsにおける「チャンネル」のことを、「ROOM」と呼んでいます。

**[用語が交錯しているので注意]**

また、scaledrone.comが供給している専用ライブラリを読み込んでおく必要があります。(下記参照)
```html
<script src='https://cdn.scaledrone.com/scaledrone-lite.min.js'></script>
```


API Keyの取得

- [scaledrone](https://www.scaledrone.com/)で、無料アカウントを作成します
- [scaledroneのダッシュボード](https://dashboard.scaledrone.com/channels)で、CHANNELを作ります。[+Create channel]ボタン
  - channel nameは任意の文字列を入力します。
  - Authenticationは、テスト用であれば*Never require authentication*が簡便
  - Message historyは、**Disable message history** を選ぶ。(RelayServer.jsは履歴利用非対応であり、セキュリティ上も履歴は残さない方がベター)
  - RelayServer.jsで設定するServiceTokenは、Channel Overviewで表示される**Channel ID**です。*（Secret Keyのほうではないので注意）*

## WebIDL
RelayServer.jsのWebIDLを以下に紹介します。
```WebIDL
enum ServiceName { "achex", "websocketin" , "websocket.in" , "scaledrone" };

[Exposed=(Window)]
interface RelayServer {
  constructor(ServiceName serviceName, USVString serviceToken);
  Promise<Channel> subscribe(optional USVString channelName);
}

interface Channel {
  readonly attribute USVString serverName;
  void onMessage(MessageHandler handler);
  void sendMessage(USVString or object );
};

callback interface MessageHandler {
  void handleMessage(object message);
};
```
