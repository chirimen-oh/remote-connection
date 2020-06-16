## RelayServer.js 概要

さまざまな WebSocket リレーサービスを使用して、CHIRIMEN デバイスを含むウェブアプリをインターネットを介して簡単に通信・連携可能にするライブラリです。

[CHIRIMEN チュートリアル](http://tutorial.chirimen.org/) 受講者など初学者による利用を想定し、機能をシンプルに絞り他のライブラリや標準 API とも使い勝手を揃えることで、簡単に使えるよう設計しています。WebSocket リレーサービスはサービス毎に用語や API なども異なりますが、RelayServer.js を使えば同じ API でいつでも好みの WebSocket リレーサービスを切り替え・組み合わせて利用できます。

## ためしてみる
- [Example](examples/example1.html) 

## ライブラリ
- [ライブラリ (RelayServer.js) はこちら](polyfill/RelayServer.js)

## 構成

![構成図](imgs/relay.png "構成図")

上の構成図で RelayServer.js の役割を示します。

- サービスごとの仕様の差異を吸収し、一つの API で利用可能にする
- CHIRIMEN 教材のためのデバイス間連携に用途を絞り、API を簡略化する
- CHIRIMEN 教材とプログラミング作法をあわせ、コールバック処理を削減し Async/Await 処理にする
- 簡易な学習・プロトタイピングを主眼とするため、セキュリティに関する特別な考慮は行っていない

## 使用方法

#### ライブラリを読み込む
```html
<script src="https://chirimen.org/remote-connection/polyfill/RelayServer.js"></script>
````

*Note: scaledrone を使用するときには追加のライブラリ読み込みが必要です (後述)*

#### 初期化 Step1: リレーサービスインスタンスを取得する
```javascript
var relay = RelayServer("achex", "chirimenSocket"); 
```

**`achex` は利用したいサービス名、`chirimenSocket` はそのサービスを利用するためのトークン (Achex の場合は任意文字列) です。**
ここでは Achex を利用する場合を例に挙げます (他のサービスでの利用については後述)。
先の図で示したように、トークンごとに別のスペース (メッセージ中継を行うグループ) が作られ、同一トークンに接続したクライアント間で通信が可能になります。

#### 初期化 Step2: チャンネルを取得する
```javascript
var channel = await relay.subscribe("chirimenLED");
```

`chirimenLED` はチャンネル名(任意の文字列)です。

- チャンネルは図のようにトークンでつくられたスペースの中にいくつも作ることができます。
- 同じチャンネルに複数のウェブアプリから接続できます。
  - 同時接続できる数や時間当たりのメッセージ送信数はサービス毎に異なりますが、数個のデバイス、アプリからの同時接続であればどのサービスでも問題ありません。
- チャンネルに接続したWebAppsの一つがメッセージを送信すると、同じチャンネルに接続している他のWebApps全てがそれを受信します。

`subscribe()` はリレーサーバと通信して登録を行う非同期関数です (通信に時間が掛かるため)。呼び出し前に **`await` を付けるのを忘れないようにしてください**。この初期化ステップは `async` を頭に付けた非同期関数内で実行するようにしましょう。


#### 初期化Step3: メッセージ受信ハンドラを設定する
```javascript
channel.onMessage(getMessage);

function getMessage(messageData){
    console.log(messageData);
}
```

`onMessage()` の引数で指定した関数の第一引数にメッセージが送られます。メッセージは文字列もしくは任意のオブジェクトです。（次項参照）

初期化は以上で完了です。

#### メッセージの送信
一旦初期化が完了すれば、同じサービス、トークン、チャンネルに登録したウェブアプリ間でメッセージを送受信できます。
メッセージを送信するときは次のように `sendMessage()` に送信したいメッセージを渡します。

```javascript
channel.sendMessage("Hello Remote Device");
```

メッセージとしてオブジェクトも受け付けられます。
```javascript
channel.sendMessage({temperature:24, humidity:60});
```

## サービスごとの利用方法

サービスごとに違いがあるのは、最初の `RelayServer` インスタンスの取得部分のみです。
```javascript
RelayServer("serverName", "serviceToken")
```

**注: scaledrone では別途専用ライブラリの読み込みも必要です**

### serverName

serverName には以下のいずれかの文字列を指定してください:
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
