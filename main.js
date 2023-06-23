const BattlefyAPI = require('battlefy-api');
const { Client, Events, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

let tournamentURL = null
let tournamentOrgName = null

let stage = null

/*

     |
   __|
  | |

*/


const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    //GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    ],
});

client.once(Events.ClientReady, c => {
    console.log(`Logged in as ${c.user.tag}`);
});

client.login(process.env.BOT_TOKEN)

class Tournament {
    constructor(stage) {
        this.stage = stage;
    }

    async updateStageData() {
        try {
            const games = await BattlefyAPI.getTournamentStageMatches(this.stage)
            return games;
        
        } catch (error) {
            console.error(error);
        };
    }
}


class Bracket {
    constructor(bracket) {
        this.matches = bracket
    }

    sendBracket(interaction) {
        let replyContent = this.getContent()
        if (replyContent === "") {
            replyContent = "There are no ongoing sets"
        }

        interaction.reply({ 
            content: replyContent
        })
    }

    getContent() {
        let fullContent = "";
        for (let item of this.matches) {
            console.log(item)
            if (item.top?.readyAt === undefined || item.bottom?.readyAt === undefined || (item?.isComplete === true)) {
                continue;
            }

            const startTime = item.top.readyAt < item.bottom?.readyAt ? new Date(item.top?.readyAt) : new Date(item.bottom?.readyAt);
            const currentTime = new Date();
            const setTime = currentTime - startTime;
            const minutes = Math.floor(setTime / 60000);
            const seconds = Math.floor((setTime % 60000) / 1000);

            fullContent += (`${item.top.team?.name} vs ${item.bottom.team?.name}: \`${minutes}:${seconds < 10 ? '0' : ''}${seconds}\`\n`);
        }
        return fullContent;
    }
}

main();

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    if (interaction.commandName === 'setstage') {
        
        const url = interaction.options.getString('url');
        const pattern = /\/stage\/([a-zA-Z0-9]+)\/(match|bracket)\//;
        const matches = url.match(pattern);

        if (matches && matches.length > 1) {
            tournamentURL = url;
            stage = matches[1];
            console.log(`Updated stage is ${stage}`)
            interaction.reply({
                content: `Successfully updated the tournament link to ${url}.`
            })
        } else {
            interaction.reply({
                content: `Invalid url.`
            })
        }

    } else if (interaction.commandName === 'update') {
        if (stage == null) {
            interaction.reply({
                content: "You need to set a stage first! \nUse the `/setstage` command to get started!"
            })
        } else {
            tournament = new Tournament(stage);
            const updatedMatches = await tournament.updateStageData();
            bracket = new Bracket(updatedMatches)

            bracket.sendBracket(interaction)
        }
    }
});

async function getMatchLink(match) {
    tourneyData = await BattlefyAPI.getTournamentData("6494fd2b42963e0cd84e4dc9") // gets me tournament data

    const pattern = /https:\/\/battlefy\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/stage\/[^\/]+\/(match|bracket)?\/?/;
    const patternMatch = tournamentURL.match(pattern);
    
    // gets us the organization name
    if (match) {
      const orgName = patternMatch[1];
      console.log(dynamicContent);
    } else {
        console.error("ERROR: No Match")
        return ""
    }
    
    const matchID = match.stats.matchID
    const tournamentID = match.stats.tournamentID   

    // https://battlefy.com/squid-junction/squid-junction-45/6488ae7ee23ab00ccf5b234c/stage/6488ae9c43a2d45dbd34a3ab/match/648e385a4d040f5057933d51

    return `https://battlefy.com/${orgName}/${tourneyData?.slug}/${tournamentID}/stage/${stage}/match/${matchID}` // finish this

}


async function main() {
    tourneyData = await BattlefyAPI.getTournamentData("6494fd2b42963e0cd84e4dc9")


    

    console.log(tourneyData)

}


