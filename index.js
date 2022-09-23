const secret_token = 'SECRET_TOKEN';
const client_id = 'CLIENT_ID';
const NPC_REGEX = new RegExp(/^(\W|^)-npc[a-zA-Z ]*?(\W|$)/);
const PLACE_REGEX = new RegExp(/^(\W|^)-place[a-zA-Z ]*?(\W|$)/);
const PLAY_REGEX = new RegExp(/^(\W|^)-play ((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/);

const ytdl = require('ytdl-core');
const play = require('play-dl');
const { video_basic_info, stream } = require('play-dl');
const { REST, Routes } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, AudioPlayerStatus, createAudioResource, NoSubscriberBehavior } = require('@discordjs/voice');

const commands = [];

const rest = new REST({ version: '10' }).setToken('token');

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

const { Client, GatewayIntentBits, IntentsBitField, Intents } = require('discord.js');
const myIntents = new IntentsBitField();
myIntents.add(
	IntentsBitField.Flags.Guilds,
	IntentsBitField.Flags.GuildMessages,
	IntentsBitField.Flags.MessageContent,
	IntentsBitField.Flags.GuildMembers,
	IntentsBitField.Flags.GuildVoiceStates
);
const client = new Client({ intents: myIntents});

const player = createAudioPlayer();
var connection = null;
var resource = null;

//Get JSON data
function getCharacterData(){
	const fs = require('fs');
	try{
		const data = fs.readFileSync('./characters.json', 'utf8');

		// parse JSON string to JSON object
		const campaignData = JSON.parse(data);
		
		return campaignData;
	} catch (err) {
		console.log(`Error reading file from disk: ${err}`);
	}
}

function getNPCData(){
	const fs = require('fs');
	try{
		const data = fs.readFileSync('./npc.json', 'utf8');

		// parse JSON string to JSON object
		const npcData = JSON.parse(data);
		
		return npcData;
	} catch (err) {
		console.log(`Error reading file from disk: ${err}`);
	}
}

function getNPCList(){
	var npcData = getNPCData();
	var reply = '';
	npcData.sort(function(a, b){
		return a.NPC.localeCompare(b.NPC);
	});
	npcData.forEach(db => {
		reply += (` - ${db.NPC}\n`);
	});
	return reply;
}

function findNPC(npc, message){
	var npcData = getNPCData();
	var match = false;
	npcData.forEach(db => {
		if(npc.toLowerCase() === (`${db.NPC}`.toLowerCase())){
			message.reply(`${db.NPC}: ${db.Description}\n`);
			match = true;
		}
	});
	if(!match){
		message.reply('No NPC Data found for ' + npc + '. Use \'-npc\' for a full list of NPCs.');
	}
}

function getPlaceData(){
	const fs = require('fs');
	try{
		const data = fs.readFileSync('./places.json', 'utf8');

		// parse JSON string to JSON object
		const placesData = JSON.parse(data);
		
		return placesData;
	} catch (err) {
		console.log(`Error reading file from disk: ${err}`);
	}
}

function getPlaceList(){
	var placeData = getPlaceData();
	var reply = '';
	placeData.sort(function(a, b){
		return a.Place.localeCompare(b.Place);
	});
	placeData.forEach(db => {
		reply += (` - ${db.Place}\n`);
	});
	return reply;
}

function findPlace(place, message){
	var placeData = getPlaceData();
	var match = false;
	placeData.forEach(db => {
		//First check parent realms
		if(place.toLowerCase() === (`${db.Place}`.toLowerCase())){
			placeReply(place, message, db);
			match = true;
		}
		//Dive in to Children
		if(db.Children != null){
			db.Children.forEach(child => {
				if(place.toLowerCase() === (`${child.Place}`.toLowerCase())){
					placeReply(place, message, child);
					match = true;
				}
				if(child.Children != null){
					child.Children.forEach(grandChild => {
						if(place.toLowerCase() === (`${grandChild.Place}`.toLowerCase())){
							placeReply(place, message, grandChild);
							match = true;
						}
					});
				}
			});
		}
	});
	if(!match){
		message.reply('No Place Data found for ' + place + '. Use \'-place\' for a full list of Places.');
	}
}

function placeReply(place, message, db){
	var childreply = '';
	var children = db.Children;
	if(children != null){
		children = db.Children.sort(function(a, b){
			return a.Place.localeCompare(b.Place);
		});;
		children.forEach(child => {
			childreply += `${child.Place}, `;
		});
		childreply = childreply.slice(0,-2);
	message.reply(`${db.Place}: ${db.Description}\nEncompasses: ${childreply}`);
	}
	else{
		message.reply(`${db.Place}: ${db.Description}\n`);
	}
} 

function getArgs(message){
	var outarg = '';
	var argsArr = message.content.split(" ");
	var i = 0;
	argsArr.forEach(arg => {
		if(i != 0){
			outarg += arg + ' ';
		}
		i++;
	});
	
	return outarg.trim();
}

async function playAudio(url){
	const streamOptions = { seek: 0, volume: 1 };
	
	// old ytdl crashes after 20 minutes
	//const stream = await ytdl(url, {filter: 'audioonly'});
			
	//resource = createAudioResource(stream);
	
	const stream = await play.stream(url, {quality: 0});
			
	resource = createAudioResource(stream.stream,{
		inputType: stream.type
	});
	connection.subscribe(player);
	player.play(resource, streamOptions);
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
	console.log(interaction);
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
});

client.on('messageCreate', async (message) =>{
	if (message.content === '-roll20'){
		message.reply('https://app.roll20.net/campaigns/details/13512129/drekyssa');
	}
	if (message.content === '-characters'){
		var campaignData = getCharacterData();
		var reply = '';
		campaignData.forEach(db => {
			reply += (`Player: ${db.Player}\nCharacter: ${db.Character}\nTavern Nickname: ${db.Nickname}\n\n`);
		});
		message.reply(reply);
	}
	if(message.content.match(NPC_REGEX)){
		if(message.content === '-npc'){
			var reply = 'Please use \'-npc NPC_NAME\' where NPC_NAME is from the list below:\n\n'
			message.reply(reply + getNPCList());
		}
		else{
			var npc = getArgs(message);
			var npcData = findNPC(npc, message);
		}
	}
	if(message.content.match(PLACE_REGEX)){
		if (message.content === '-place'){
			var placeData = getPlaceList();
			var reply = 'Please use \'-place PLACE_NAME\' where PLACE_NAME is from the list below:\n\n';
			message.reply(reply + getPlaceList());
		}
		else{
			var place = getArgs(message);
			var placeData = findPlace(place, message);
		}
	}
	if(message.content === '-join'){
		var channel = message.member.voice;
		
		connection = joinVoiceChannel({
			channelId: channel.channelId,
			guildId: channel.guild.id,
			adapterCreator: message.guild.voiceAdapterCreator,
			selfDeaf: false
		})
	}
	if(message.content.match(PLAY_REGEX)){
		if(connection != null && connection._state.status != 'disconnected'){
			var url = getArgs(message);
			
			playAudio(url);
		}
	}
	if(message.content === '-stop'){
		player.stop();
	}
});

client.login(secret_token);