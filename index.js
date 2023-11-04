const Discord = require('discord.js');
const mysql = require('mysql');
const fs = require('fs');
const Gamedig = require('gamedig');
require('dotenv').config();

const bot = new Discord.Client();

var conn_local = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: "",
    database: process.env.MYSQL_DB
});

let ports = {
    zombie: '27015',
};

conn_local.connect(err =>{
    if( err ) 
        fs.writeFileSync('errors.txt', `couldn't connect to database: ${err}`);
})

try {  
    var id = fs.readFileSync('saveid.txt', 'utf8');
    var id_requests = fs.readFileSync('saveid_req.txt', 'utf8');
    var id_nick = fs.readFileSync('saveid_nickreg.txt', 'utf8');
    bot.setInterval(function() {
        main();
        check_requests();
        check_nickreg();
    }, 5000);

} catch(e) {
    fs.writeFileSync('errors.txt', `error retrieving data from files and set task: ${e.stack}`);
}

function check_requests()
{
    conn_local.query(`SELECT * FROM ingame_requests WHERE id > ${id_requests}`, (err, results) =>{
        if( err )
            fs.writeFileSync('errors.txt', `error database ingame_requests: ${err}`);

        Object.keys(results).forEach(function (key) {
            
            const row = results[key];

            const embed = new Discord.MessageEmbed()
            .setAuthor(`Player ${row.user}`, bot.user.avatarURL)
            .setColor(0x0B0050)
            .addField(`Request`, 'Requesting for VIP')
            .setTimestamp();
            
            bot.channels.cache.get(process.env.VIPCHANNEL).send(embed);
        });
        if( results.length > 0 )
        {
            if( !isNaN(results[ results.length - 1 ].id) )
            {
                id_requests = results[ results.length - 1 ].id;
                fs.writeFileSync('saveid_req.txt', `${id_requests}`);
            }
        }
            
    });
}
function check_nickreg()
{
    conn_local.query(`SELECT * FROM nickreg_request WHERE id > ${id_nick}`, (err, results) =>{
        if( err )
            fs.writeFileSync('errors.txt', `error database nickreg_requests: ${err}`);

        Object.keys(results).forEach(function (key) {
            
            const row = results[key];

            const embed = new Discord.MessageEmbed()
            .setAuthor(`Player ${row.name}`, bot.user.avatarURL)
            .setColor(0x0B0050)
            .addFields(
                { name: `ID`, value: `${row.id}`, inline: true },
                { name:`SteamID`, value:`${row.steamid}`, inline: true },
                { name:`IP`,      value:`${row.ip}`, inline: true },
            )
            .addField(`Request`, 'Requesting for Nick')
            .addFields(
                { name:`Email`, value:`${row.email}`, inline: true },
                { name:`Password`, value:`${row.password}`, inline:true },
            )
            .setTimestamp();
            
            bot.channels.cache.get(process.env.NICKREGCHANNEL).send(embed);
        });
        if( results.length > 0 )
        {
            if( !isNaN(results[ results.length - 1 ].id) )
            {
                id_nick = results[ results.length - 1 ].id;
                fs.writeFileSync('saveid_nickreg.txt', `${id_nick}`);
            }
        }
            
    });
}
function main()
{
    conn_local.query(`SELECT id,name,unix_timestamp(time) as time, steamid, suggestion FROM db_suggestions WHERE id > ${id}`, (err, results) =>{
        if( err )
            fs.writeFileSync('errors.txt', `error database db_suggestions: ${err}`);
            
        Object.keys(results).forEach(function (key) {
            
            const row = results[key];

            const embed = new Discord.MessageEmbed()
            .setAuthor(`Player ${row.name}`, bot.user.avatarURL)
            .setColor(0x0B0050)
            .addField(`Suggestion`, `${row.suggestion}`)
            .addField('SteamID', `${row.steamid}` )
            .setTimestamp(`${row.time}`);
            
            bot.channels.cache.get(process.env.SUGGESTIONCHANNEL).send(embed);
        });
        if( results.length > 0 )
        {  
            //console.log( `ID: ${results[ results.length - 1 ].id} ; isnan value: ${!isNaN(results[ results.length - 1 ].id )}`)
            if( !isNaN(results[ results.length - 1 ].id ) )
            {
                id = results[ results.length - 1 ].id;
                fs.writeFileSync('saveid.txt', `${id}`);
            }
        }
            
    });
}

function RunQuery( port )
{
    Gamedig.query({
        type: 'cs16',
        host: '185.107.96.138',
        port: port
    }).then((state) => {
        var players = state.players.map(player => player.name);
        let embed = new Discord.MessageEmbed()
        .setTitle(`Server: \`\`\`${state.name}\`\`\``)
        .setDescription(`Join **steam://connect/${state.connect}/**`)
        .addField("Players", `\` ${state.players.length} / ${state.maxplayers} \``)
        .setColor("GRAY")
        .setTimestamp();
        if( state.players.length > 0 )
            embed.addField("Players name",`\`\`\`${players.join('\n')}\`\`\``);
    
        bot.channels.cache.get(process.env.SERVERINFOCHANNEL).send(embed);
        //console.log(state);
    }).catch((error) => {
        bot.channels.cache.get(process.env.SERVERINFOCHANNEL).send("Server is offline.");
        console.log(error);
    });
}

bot.on('message', msg => {
    if(!msg.member) {
        return;
    }

    if( msg.channel.id == process.env.SERVERINFOCHANNEL )
    {
        if (!msg.content.startsWith("!") || msg.author.bot) return;

            const args = msg.content.slice(1).trim().split(' ');
            const command = args.shift().toLowerCase();
            let server = args.shift();
            if( server )
                server = server.toLowerCase();
            if( command !== 'server' )  return;
            if( ports[server] != null )
                RunQuery( ports[server] )
            else
                msg.reply( 'Usage: !server < zombie >');
    }
    else if(msg.member.roles.cache.has(process.env.ADMINROLE)) {
        if( msg.channel.id == process.env.NICKREGCHANNEL )
        {
            if (!msg.content.startsWith("!") || msg.author.bot) return;

            const args = msg.content.slice(1).trim().split(' ');
            const command = args.shift().toLowerCase();
            const reg_id = args.shift();
            
            if( isNaN( reg_id )  )
            {
                msg.reply( "not a number" );
                return;
            }   
            if( command != "reg" )
            {
                msg.reply( "command not reg");
                return;
            }  
            
            conn_local.query( `SELECT * FROM nickreg_request WHERE id = ${reg_id}`, (err,res)=>{
                if( err )
                    fs.writeFileSync('errors.txt', `error database nickreg registering: ${err}`);
                
                if( res.length != 1 )
                {
                    msg.reply('ID not found!');
                    return;
                }
                //const name = res[0].name; 
                //msg.reply( `Im here ${res[0].nick}` );
                conn_local.query( `INSERT IGNORE INTO amx_admins VALUES(NULL,${mysql.escape(res[0].name)},${mysql.escape(res[0].steamid)}, md5(concat(md5(${mysql.escape(res[0].password)}),process.env.HASHID)),${mysql.escape(res[0].email)},'z','a',unix_timestamp(),0,NULL,NULL);` ,(error,result)=>{
                    if( error ) 
                        fs.writeFileSync('errors.txt', `error insterting into amx_admins: ${err}`);
                    if( !result.affectedRows )
                    {
                        conn_local.query(`SELECT username,email FROM amx_admins WHERE username=${mysql.escape(res[0].name)} OR email=${mysql.escape(res[0].email)};`,(errorI,resultI)=>{
                            if( errorI )
                                fs.writeFileSync('errors.txt', `error insterting into amx_admins internal: ${err}`);
                            else
                            {
                                if( resultI.length > 0 )
                                {
                                    if( resultI[0].username == res[0].name )
                                        msg.reply('Nick is already registered.');
                                    else if( resultI[0].email == res[0].email )
                                        msg.reply(`Email is already registered for nick ${resultI[0].username}`);
                                    else
                                        msg.reply("Couldn't add nick. Probably nick or email is already registered. Try manually." );
                                }
                                else
                                    msg.reply("Couldn't add nick. Probably nick or email is already registered. Try manually." );
                            }
                        })
                        return;
                    }
                    msg.reply( `Nick: ${res[0].name} registered successfully!` );
                })
            })
            
        }
        else if( msg.channel.id == process.env.SUGGESTIONCHANNEL )
        {
            if( msg.content === "!read" )
            {
                conn_local.query( "UPDATE db_suggestions SET is_seen=1;", (err,res)=>{
                    if( err ) 
                        fs.writeFileSync('errors.txt', `error updating suggestions: ${err}`);
                    msg.reply('Done!');
                })
            }
        }
    } 
});


bot.on('ready', () => {

    //bot.channels.get(process.env.GAMECHANNEL).send(embed);
    
    bot.channels.cache.get(process.env.GAMECHANNEL).messages.fetch(process.env.MSGID);
    /*.then(msg => msg.edit(embed))
    .catch(console.log);*/
});

bot.on('messageReactionAdd', (reaction, user) => {
    //console.log( "im here" );
    let message = reaction.message; 
    let emoji = reaction.emoji; 
    //if( message.channel.id !== process.env.GAMECHANNEL)  return;
    if( message.id !== process.env.MSGID )  return;
    //console.log( `messageID: ${message.id} | my id: ${process.env.MSGID}`);
    //console.log( `name ${emoji.name} id ${emoji.id}`);

    if( emoji.name === 'csgologo' ){
        message.guild.members.fetch(user.id).then(member =>{
            member.roles.add(process.env.CSGOROLE);
        })
    }
    else if( emoji.name === 'lollogo' )
    {
        message.guild.members.fetch(user.id).then(member =>{
            member.roles.add(process.env.LOLROLE);
        })
    }
    else if( emoji.name === 'mclogo' )
    {
        //console.log( "im here" );
        message.guild.members.fetch(user.id).then(member =>{
            member.roles.add(process.env.MCROLE);
        })
    }
    else if( emoji.name === 'cslogo' )
    {
        message.guild.members.fetch(user.id).then(member =>{
            member.roles.add(process.env.CSROLE);
        })
    }
    else
    {
        reaction.remove();
    }
})

bot.on('messageReactionRemove', (reaction, user) => {
    let message = reaction.message; 
    let emoji = reaction.emoji; 

    if( message.id !== process.env.MSGID )  return;

    if( emoji.name === 'csgologo' ){
        message.guild.members.fetch(user.id).then(member =>{
            member.roles.remove(process.env.CSGOROLE);
        })
    }
    else if( emoji.name === 'lollogo' )
    {
        message.guild.members.fetch(user.id).then(member =>{
            member.roles.remove(process.env.LOLROLE);
        })
    }
    else if( emoji.name === 'mclogo' )
    {
        //console.log( "im here" );
        message.guild.members.fetch(user.id).then(member =>{
            member.roles.remove(process.env.MCROLE);
        })
    }
    else if( emoji.name === 'cslogo' )
    {
        message.guild.members.fetch(user.id).then(member =>{
            member.roles.remove(process.env.CSROLE);
        })
    }
})

bot.login(process.env.BOTTOKEN);