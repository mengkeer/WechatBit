/**
 * WechatBot
 *  - https://github.com/gengchen528/wechatBot
 */
const {Wechaty,Friendship} = require('wechaty')
const schedule = require('./schedule/index')
const config = require('./config/index')
const untils = require('./untils/index')
const superagent = require('./superagent/index')
const {FileBox} = require('file-box') //文件读取模块
//  二维码生成
function onScan (qrcode, status) {
  require('qrcode-terminal').generate(qrcode)  // 在console端显示二维码
  const qrcodeImageUrl = [
	'https://api.qrserver.com/v1/create-qr-code/?data=',
	encodeURIComponent(qrcode),
  ].join('')
  console.log(qrcodeImageUrl)
}

// 登录
async function onLogin (user) {
  console.log(`贴心小助理${user}登录了`)
  // 登陆后创建定时任务
  schedule.setSchedule(config.SENDDATE,()=>{
	console.log('你的贴心小助理开始工作啦！')
    main()
  })
}

//登出
function onLogout(user) {
  console.log(`${user} 登出`)
}
// 监听对话 根据关键词自动加群
async function onMessage (msg) {
  const contact = msg.from() // 发消息人
  const content = msg.text() //消息内容
  const type = msg.type() // 消息类型
  const room = msg.room() //是否是群消息
  const roomCodeUrl = FileBox.fromUrl(config.ROOMCODEURL) //来自url的文件
  const roomCodeLocal = FileBox.fromFile(config.ROOMLOCALPATH) //添加本地文件
  if (msg.self()) {
	return
  }
  const name = contact.name()
  if (type != 7) {
  	return //暂时只打印文本消息
	  room.find()
  }
  if(room){ // 如果是群消息
	const topic = await room.topic()
    console.log(`群名: ${topic} 发消息人: ${contact.name()} 内容: ${content}`)
	  if(config.AutoReplyInGroup && content.indexOf(config.AutoReplyInGroup_key) != -1) {
		  let reply_text = config.AutoReplyInGroup_Reply
		  let reply_img = FileBox.fromUrl(config.AutoReplyInGroup_Img)
		  try{
			  await room.say(reply_text, contact)
			  await room.say(reply_img)
		  }catch (e) {
			  console.error(e)
		  }
	  }
  }else { // 如果非群消息
	console.log(`发消息人: ${contact.name()} 消息内容: ${content}`)
	if(config.AUTOADDROOM){ //判断是否开启自动加群功能
	  let addRoomReg = eval(config.ADDROOMWORD)
	  let roomReg = eval(config.ROOMNAME)
	  if(addRoomReg.test(content)&&!room){
		let keyRoom = await this.Room.find({topic: roomReg})
		if(keyRoom){
		  try{
              await contact.say('你好，由于目前群里人数超过100，群主将会看到消息后，第一时间把你拉入群中！')
              await contact.say('谢谢理解^_^')
			// await contact.say(roomCodeLocal||roomCodeUrl)
		  }catch (e) {
			console.error(e)
		  }
		}
	  }else {
		if(config.AUTOREPLY){ // 如果开启自动聊天
		  let reply = await superagent.getReply(content)
		  console.log('图灵机器人回复：',reply)
		  try{
			await contact.say(reply)
		  }catch (e) {
			console.error(e)
		  }
		}
	  }
	}else {
	  if(config.AUTOREPLY&&config.AutoReplyWhiteList.indexOf(name) != -1){ // 如果开启自动聊天
		var reply = await superagent.getReply(content)
		  if (reply == config.AutoReplyInGroup_Reply) {
			  reply = getCustomReply(name)
		  }
		console.log('图灵机器人回复：',reply)
		try{
		  await contact.say(reply)
		}catch (e) {
		  console.error(e)
		}
	  }
	}
  }
}

function getCustomReply(name) { // 青云api，智能聊天机器人
	if(name == '玄鸟降.') {
		return '你好，你聊天的对象正在玩游戏，这是自动回复消息,么么哒😘'
	}
	return config.AutoReplyInGroup_Reply
}
// 自动加好友功能
async function onFriendShip(friendship) {
  let logMsg
  try {
	logMsg = '添加好友' + friendship.contact().name()
	console.log(logMsg)

	switch (friendship.type()) {
		/**
		 *
		 * 1. New Friend Request
		 *
		 * when request is set, we can get verify message from `request.hello`,
		 * and accept this request by `request.accept()`
		 */
	  case Friendship.Type.Receive:
	    let addFriendReg = eval(config.ADDFRIENDWORD)
		if (addFriendReg.test(friendship.hello())&&config.AUTOADDFRIEND) { //判断是否开启自动加好友功能
		  logMsg = '自动添加好友，因为验证信息中带关键字‘每日说’'
		  await friendship.accept()
		} else {
		  logMsg = '没有通过验证 ' + friendship.hello()
		}
		break
		/**
		 *
		 * 2. Friend Ship Confirmed
		 *
		 */
	  case Friendship.Type.Confirm:
		logMsg = 'friend ship confirmed with ' + friendship.contact().name()
		break
	}
  } catch (e) {
	logMsg = e.message
  }
  console.log(logMsg)
}
// 自动发消息功能
async function main() {
  let logMsg
  let contact = await bot.Contact.find({name:config.NICKNAME}) || await bot.Contact.find({alias:config.NAME}) // 获取你要发送的联系人
  let one = await superagent.getOne() //获取每日一句
  let weather = await superagent.getWeather() //获取天气信息
  let today = await untils.formatDate(new Date())//获取今天的日期
  let memorialDay = untils.getDay(config.MEMORIAL_DAY)//获取纪念日天数
  let str = today +  '<br>我们在一起的第' + memorialDay + '天<br>'+ '<br>元气满满的一天开始啦,要开心噢^_^<br>'
    + '<br>今日天气<br>' + weather.weatherTips +'<br>' +weather.todayWeather+ '<br>每日一句:<br>'+one+'<br><br>'+'————————最爱你的我'
  try{
    logMsg = str
	await contact.say(str) // 发送消息
  }catch (e) {
	logMsg = e.message
  }
  console.log(logMsg)
}
// 加群提醒
function roomJoin(room, inviteeList, inviter) {
  const nameList = inviteeList.map(c => c.name()).join(',')
  room.topic().then(function (res) {
	const roomNameReg = eval(config.ROOMNAME)
	if(roomNameReg.test(res)){
	  console.log(`群名： ${res} ，加入新成员： ${nameList}, 邀请人： ${inviter}`)
	  room.say(`${res}：欢迎新朋友 @${nameList}，<br>使用过程中有什么问题都可以在群里提出`)
	}
  })
}

const bot = new Wechaty({name:'WechatEveryDay'})

bot.on('scan',    onScan)
bot.on('login',   onLogin)
bot.on('logout',  onLogout)
bot.on('message', onMessage)
bot.on('friendship', onFriendShip)
bot.on('room-join',roomJoin)

bot.start()
	.then(() => console.log('开始登陆微信'))
	.catch(e => console.error(e))
